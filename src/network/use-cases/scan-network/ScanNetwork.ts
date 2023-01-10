import { err, ok, Result } from 'neverthrow';
import NetworkUpdate from '../../domain/NetworkUpdate';
import { inject, injectable } from 'inversify';
import { NetworkWriteRepository } from '../../infrastructure/repositories/NetworkWriteRepository';
import { HeartBeater } from '../../../core/services/HeartBeater';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Network } from '@stellarbeat/js-stellar-domain';
import { Logger } from '../../../core/services/PinoLogger';
import { Archiver } from '../../domain/archiver/Archiver';
import { Notify } from '../../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { QuorumSet } from '../../domain/QuorumSet';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { NetworkReadRepository } from '../../services/NetworkReadRepository';
import {
	NetworkUpdater,
	NetworkUpdateResult
} from '../../domain/NetworkUpdater';
import { NetworkConfig } from '../../../core/config/Config';
import { NetworkQuorumSetMapper } from '../update-network/NetworkQuorumSetMapper';
import { ScanNetworkDTO } from './ScanNetworkDTO';

enum RunState {
	idle,
	updating,
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
		@inject(NETWORK_TYPES.NetworkReadRepository)
		protected networkReadRepository: NetworkReadRepository,
		protected networkRepository: NetworkWriteRepository,
		protected networkUpdater: NetworkUpdater,
		@inject('JSONArchiver') protected jsonArchiver: Archiver,
		@inject('HeartBeater') protected heartBeater: HeartBeater,
		protected notify: Notify,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async execute(dto: ScanNetworkDTO) {
		return new Promise((resolve, reject) => {
			const quorumSetOrError = NetworkQuorumSetMapper.fromArray(
				this.networkConfig.quorumSet
			);
			if (quorumSetOrError.isErr()) {
				return reject(quorumSetOrError.error);
			}
			this.logger.info('config', {
				quorumSet: quorumSetOrError.value
			});
			this.run(quorumSetOrError.value, dto.dryRun)
				.then(() => {
					if (dto.loop) {
						this.loopTimer = setInterval(async () => {
							try {
								if (this.runState === RunState.idle)
									await this.run(quorumSetOrError.value, dto.dryRun);
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

	protected async run(networkQuorumSet: QuorumSet, dryRun: boolean) {
		this.logger.info('Starting new network update');
		const start = new Date();
		this.runState = RunState.updating;
		const updateResult = await this.updateNetwork(networkQuorumSet);
		if (updateResult.isErr()) {
			this.exceptionLogger.captureException(updateResult.error);
			this.runState = RunState.idle;
			return; //don't persist this result and try again
		}
		if (dryRun) {
			this.logger.info('Dry run complete');
			this.runState = RunState.idle;
			return;
		}

		this.runState = RunState.persisting;
		const persistResult = await this.persistNetworkUpdateAndNotify(
			updateResult.value.networkUpdate,
			updateResult.value.network
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

	protected async updateNetwork(
		networkQuorumSet: QuorumSet
	): Promise<Result<NetworkUpdateResult, Error>> {
		const latestNetworkResult = await this.findLatestNetwork();
		if (latestNetworkResult.isErr()) return err(latestNetworkResult.error);

		return await this.networkUpdater.update(
			latestNetworkResult.value,
			networkQuorumSet
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

	protected async persistNetworkUpdateAndNotify(
		networkUpdate: NetworkUpdate,
		network: Network
	): Promise<Result<undefined, Error>> {
		this.logger.info('Persisting network update');
		const result = await this.networkRepository.save(networkUpdate, network);
		if (result.isErr()) return err(result.error);

		this.logger.info('Sending notifications');
		(
			await this.notify.execute({
				networkUpdateTime: networkUpdate.time
			})
		).mapErr((error) => this.exceptionLogger.captureException(error));

		this.logger.info('JSON Archival');
		(
			await this.jsonArchiver.archive(
				network.nodes,
				network.organizations,
				networkUpdate.time
			)
		).mapErr((error) => this.exceptionLogger.captureException(error));

		this.logger.info('Trigger heartbeat');
		(await this.heartBeater.tick()).mapErr((e) =>
			this.exceptionLogger.captureException(e)
		);

		return ok(undefined);
	}

	public shutDown(callback: () => void) {
		if (this.loopTimer !== null) clearInterval(this.loopTimer);
		if (this.runState !== RunState.persisting) return callback();
		this.logger.info('Persisting update, will shutdown when ready');
		this.shutdownRequest = { callback: callback };
	}
}
