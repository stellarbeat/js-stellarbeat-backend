import { err, ok, Result } from 'neverthrow';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import { inject, injectable } from 'inversify';
import { NetworkWriteRepository } from '../../infrastructure/repositories/NetworkWriteRepository';
import { HeartBeater } from '../../../core/services/HeartBeater';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Network } from '@stellarbeat/js-stellarbeat-shared';
import { Logger } from '../../../core/services/PinoLogger';
import { Archiver } from '../../domain/network/scan/archiver/Archiver';
import { Notify } from '../../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { NetworkReadRepository } from '../../infrastructure/repositories/NetworkReadRepository';
import {
	NetworkScanner,
	NetworkScanResult
} from '../../domain/network/scan/NetworkScanner';
import { NetworkConfig } from '../../../core/config/Config';
import { ScanNetworkDTO } from './ScanNetworkDTO';
import { UpdateNetwork } from '../update-network/UpdateNetwork';
import { UpdateNetworkDTO } from '../update-network/UpdateNetworkDTO';
import { NetworkRepository } from '../../domain/network/NetworkRepository';
import { NetworkId } from '../../domain/network/NetworkId';
import { NodeRepository } from '../../domain/node/NodeRepository';
import { NodeMeasurementDayRepository } from '../../domain/node/NodeMeasurementDayRepository';

enum RunState {
	idle,
	scanning,
	persisting
}

@injectable()
export class ScanNetwork {
	protected shutdownRequest?: {
		callback: () => void;
	};

	protected runState: RunState = RunState.idle;
	protected loopTimer: NodeJS.Timer | null = null;

	static UPDATE_RUN_TIME_MS = 1000 * 60 * 3; //update network every three minutes

	constructor(
		private networkConfig: NetworkConfig,
		private updateNetworkUseCase: UpdateNetwork,
		@inject(NETWORK_TYPES.NetworkRepository)
		private versionedNetworkRepository: NetworkRepository,
		@inject(NETWORK_TYPES.NetworkReadRepository)
		protected networkReadRepository: NetworkReadRepository,
		protected networkRepository: NetworkWriteRepository,
		@inject(NETWORK_TYPES.NodeRepository)
		protected nodeRepository: NodeRepository,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		protected networkScanner: NetworkScanner,
		@inject('JSONArchiver') protected jsonArchiver: Archiver,
		@inject('HeartBeater') protected heartBeater: HeartBeater,
		protected notify: Notify,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async execute(dto: ScanNetworkDTO) {
		const updateNetworkResult = await this.updateNetwork(this.networkConfig);
		if (updateNetworkResult.isErr()) {
			//todo: needs cleaner solution, but this usecase needs refactoring first
			this.exceptionLogger.captureException(updateNetworkResult.error);
			throw updateNetworkResult.error;
		}
		const networkId = new NetworkId(this.networkConfig.networkId);
		return new Promise((resolve, reject) => {
			this.run(networkId, dto.dryRun)
				.then(() => {
					if (dto.loop) {
						this.loopTimer = setInterval(async () => {
							try {
								if (this.runState === RunState.idle)
									await this.run(networkId, dto.dryRun);
								else {
									this.exceptionLogger.captureException(
										new Error('Network update exceeding expected run time')
									);
								}
							} catch (e) {
								reject(e);
							}
						}, ScanNetwork.UPDATE_RUN_TIME_MS);
					} else resolve(undefined);
				})
				.catch((reason) => reject(reason));
		});
	}

	protected async run(networkId: NetworkId, dryRun: boolean) {
		this.logger.info('Starting new network update');
		const start = new Date();
		this.runState = RunState.scanning;
		const scanResult = await this.scanNetwork(networkId);
		if (scanResult.isErr()) {
			this.exceptionLogger.captureException(scanResult.error);
			this.runState = RunState.idle;
			return; //don't persist this result and try again
		}
		if (dryRun) {
			this.logger.info('Dry run complete');
			this.runState = RunState.idle;
			return;
		}

		this.runState = RunState.persisting;
		const persistResult = await this.persistNetworkScanAndNotify(
			scanResult.value.networkScan,
			scanResult.value.network
		);

		if (persistResult.isErr()) {
			this.exceptionLogger.captureException(persistResult.error);
		}
		//we try again in a next crawl.

		if (this.shutdownRequest) this.shutdownRequest.callback();

		const end = new Date();
		const runningTime = end.getTime() - start.getTime();
		this.logger.info('Network successfully updated', {
			'runtime(ms)': runningTime
		});

		this.runState = RunState.idle;
	}

	protected async scanNetwork(
		networkId: NetworkId
	): Promise<Result<NetworkScanResult, Error>> {
		const network = await this.versionedNetworkRepository.findActiveByNetworkId(
			networkId
		);
		if (!network) {
			return err(new Error(`Network with id ${networkId} not found`));
		}

		const latestNetworkResult = await this.findLatestNetwork();
		if (latestNetworkResult.isErr()) return err(latestNetworkResult.error);

		this.logger.info('Fetching active nodes');
		const nodes = await this.nodeRepository.findActive(
			latestNetworkResult.value.time
		);
		this.logger.info('Active nodes found', {
			count: nodes.length
		});

		const measurement30DayAverages =
			await this.nodeMeasurementDayRepository.findXDaysAverageAt(
				new Date(),
				30
			);

		return await this.networkScanner.scan(
			latestNetworkResult.value,
			network,
			nodes,
			measurement30DayAverages
		);
	}

	private async findLatestNetwork(): Promise<Result<Network, Error>> {
		const latestNetworkResult = await this.networkReadRepository.getNetwork(
			new Date()
		);
		if (latestNetworkResult.isErr()) return err(latestNetworkResult.error);

		if (latestNetworkResult.value === null) {
			return err(
				new Error('No network found in database, please use seed script')
			);
		}

		return ok(latestNetworkResult.value);
	}

	protected async persistNetworkScanAndNotify(
		scan: NetworkScan,
		network: Network
	): Promise<Result<undefined, Error>> {
		this.logger.info('Persisting network update');
		const result = await this.networkRepository.save(scan, network);
		if (result.isErr()) return err(result.error);

		this.logger.info('Sending notifications');
		(
			await this.notify.execute({
				networkUpdateTime: scan.time
			})
		).mapErr((error) => this.exceptionLogger.captureException(error));

		this.logger.info('JSON Archival');
		(
			await this.jsonArchiver.archive(
				network.nodes,
				network.organizations,
				scan.time
			)
		).mapErr((error) => this.exceptionLogger.captureException(error));

		this.logger.info('Trigger heartbeat');
		(await this.heartBeater.tick()).mapErr((e) =>
			this.exceptionLogger.captureException(e)
		);

		return ok(undefined);
	}

	private async updateNetwork(
		networkConfig: NetworkConfig
	): Promise<Result<void, Error>> {
		const updateNetworkDTO: UpdateNetworkDTO = {
			time: new Date(),
			name: networkConfig.networkName,
			networkId: networkConfig.networkId,
			passphrase: networkConfig.networkPassphrase,
			networkQuorumSet: networkConfig.quorumSet,
			overlayVersion: networkConfig.overlayVersion,
			overlayMinVersion: networkConfig.overlayMinVersion,
			ledgerVersion: networkConfig.ledgerVersion,
			stellarCoreVersion: networkConfig.stellarCoreVersion
		};

		return await this.updateNetworkUseCase.execute(updateNetworkDTO);
	}

	public shutDown(callback: () => void) {
		if (this.loopTimer !== null) clearInterval(this.loopTimer);
		if (this.runState !== RunState.persisting) return callback();
		this.logger.info('Persisting update, will shutdown when ready');
		this.shutdownRequest = { callback: callback };
	}
}
