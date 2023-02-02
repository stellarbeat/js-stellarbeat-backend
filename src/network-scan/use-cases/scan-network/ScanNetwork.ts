import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { HeartBeater } from '../../../core/services/HeartBeater';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Logger } from '../../../core/services/PinoLogger';
import { Archiver } from '../../domain/network/scan/archiver/Archiver';
import { Notify } from '../../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { NetworkConfig } from '../../../core/config/Config';
import { ScanNetworkDTO } from './ScanNetworkDTO';
import { UpdateNetwork } from '../update-network/UpdateNetwork';
import { UpdateNetworkDTO } from '../update-network/UpdateNetworkDTO';
import { NetworkRepository } from '../../domain/network/NetworkRepository';
import { NetworkId } from '../../domain/network/NetworkId';
import { NodeMeasurementDayRepository } from '../../domain/node/NodeMeasurementDayRepository';
import { Scanner, ScanResult } from '../../domain/Scanner';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { ScanRepository } from '../../domain/ScanRepository';
import { NetworkDTOService } from '../../services/NetworkDTOService';
import { NodeAddress } from '../../domain/node/NodeAddress';
import { InvalidKnownPeersError } from './InvalidKnownPeersError';

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
		private networkRepository: NetworkRepository,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		private scanRepository: ScanRepository,
		protected scanner: Scanner,
		private networkService: NetworkDTOService,
		@inject('JSONArchiver') protected jsonArchiver: Archiver,
		@inject('HeartBeater') protected heartBeater: HeartBeater,
		protected notify: Notify,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async execute(dto: ScanNetworkDTO) {
		const updateNetworkResult = await this.updateNetwork(this.networkConfig);
		if (updateNetworkResult.isErr()) {
			//todo: needs cleaner solution, but this use-case needs refactoring first
			this.exceptionLogger.captureException(updateNetworkResult.error);
			throw updateNetworkResult.error;
		}
		const networkId = new NetworkId(this.networkConfig.networkId);
		return new Promise((resolve, reject) => {
			this.run(networkId, this.networkConfig.knownPeers, dto.dryRun)
				.then(() => {
					if (dto.loop) {
						this.loopTimer = setInterval(async () => {
							try {
								if (this.runState === RunState.idle)
									await this.run(
										networkId,
										this.networkConfig.knownPeers,
										dto.dryRun
									);
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

	protected async run(
		networkId: NetworkId,
		knownPeers: [string, number][],
		dryRun: boolean
	) {
		this.logger.info('Starting new network update');
		const start = new Date();
		this.runState = RunState.scanning;
		const scanResult = await this.scanNetwork(networkId, knownPeers);
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
		const persistResult = await this.persistScanResultAndNotify(
			scanResult.value
		);

		if (persistResult.isErr()) {
			this.exceptionLogger.captureException(persistResult.error);
		}
		//we try again in a next scan.

		if (this.shutdownRequest) this.shutdownRequest.callback();

		const end = new Date();
		const runningTime = end.getTime() - start.getTime();
		this.logger.info('Network successfully updated', {
			'runtime(ms)': runningTime
		});

		this.runState = RunState.idle;
	}

	protected async scanNetwork(
		networkId: NetworkId,
		knownPeers: [string, number][]
	): Promise<Result<ScanResult, Error>> {
		const network = await this.networkRepository.findActiveByNetworkId(
			networkId
		);
		if (!network) {
			return err(new Error(`Network with id ${networkId} not found`));
		}

		const nodeAddressesOrError = Result.combine(
			knownPeers.map((peer) => {
				return NodeAddress.create(peer[0], peer[1]);
			})
		);
		if (nodeAddressesOrError.isErr()) {
			return err(new InvalidKnownPeersError(nodeAddressesOrError.error));
		}

		const latestScanResultOrError = await this.scanRepository.findLatest();
		if (latestScanResultOrError.isErr())
			return err(latestScanResultOrError.error);

		const nodeMeasurementAverages =
			latestScanResultOrError.value !== null
				? await this.nodeMeasurementDayRepository.findXDaysAverageAt(
						latestScanResultOrError.value.nodeScan.time,
						30
				  )
				: [];

		return await this.scanner.scan(
			new Date(), //todo: inject?
			nodeAddressesOrError.value,
			network,
			latestScanResultOrError.value,
			nodeMeasurementAverages
		);
	}

	protected async persistScanResultAndNotify(
		scanResult: ScanResult
	): Promise<Result<undefined, Error>> {
		this.logger.info('Persisting nodes');
		const result = await this.scanRepository.saveAndRollupMeasurements(
			scanResult.nodeScan,
			scanResult.organizationScan,
			scanResult.networkScan
		);
		if (result.isErr()) {
			this.logger.error('Aborting scan, error persisting scan result');
			return err(result.error);
		}

		this.logger.info('Sending notifications');
		(
			await this.notify.execute({
				networkUpdateTime: scanResult.networkScan.time
			})
		).mapErr((error) => this.exceptionLogger.captureException(error));

		try {
			const networkDTOOrError = await this.networkService.getNetworkDTOAt(
				scanResult.networkScan.time
			);
			if (networkDTOOrError.isErr()) return err(networkDTOOrError.error);
			if (networkDTOOrError.value === null)
				return err(new Error('Could not find networkDTO for archival'));
			this.logger.info('JSON Archival');
			(
				await this.jsonArchiver.archive(
					networkDTOOrError.value.nodes,
					networkDTOOrError.value.organizations,
					scanResult.networkScan.time
				)
			).mapErr((error) => this.exceptionLogger.captureException(error));
		} catch (e) {
			return err(mapUnknownToError(e));
		}

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
