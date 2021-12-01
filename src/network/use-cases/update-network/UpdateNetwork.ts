import { err, ok, Result } from 'neverthrow';
import NetworkUpdate from '../../domain/NetworkUpdate';
import { inject, injectable } from 'inversify';
import { NetworkWriteRepository } from '../../repositories/NetworkWriteRepository';
import { CrawlerService } from '../../services/CrawlerService';
import { HomeDomainUpdater } from '../../services/HomeDomainUpdater';
import { TomlService } from '../../services/TomlService';
import { GeoDataService } from '../../services/IpStackGeoDataService';
import { FullValidatorDetector } from '../../services/FullValidatorDetector';
import { HeartBeater } from '../../services/DeadManSnitchHeartBeater';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Network, NodeIndex } from '@stellarbeat/js-stellar-domain';
import { Logger } from '../../../shared/services/PinoLogger';
import NetworkReadRepository from '../../repositories/NetworkReadRepository';
import { JSONArchiver } from '../../services/archiver/JSONArchiver';
import { Notify } from '../../../network-event-notifications/use-cases/determine-events-and-notify-subscribers/Notify';

export type NetworkUpdateResult = {
	network: Network;
	networkUpdate: NetworkUpdate;
};

enum RunState {
	idle,
	updating,
	persisting
}

@injectable()
export class UpdateNetwork {
	protected shutdownRequest?: {
		callback: () => void;
	};

	protected runState: RunState = RunState.idle;
	protected dryRun = false; //todo make parameter

	static UPDATE_RUN_TIME_MS = 1000 * 60 * 3; //update network every three minutes

	constructor(
		protected loop = false,
		protected networkReadRepository: NetworkReadRepository,
		protected networkRepository: NetworkWriteRepository,
		protected crawlerService: CrawlerService,
		protected homeDomainUpdater: HomeDomainUpdater,
		protected tomlService: TomlService,
		@inject('GeoDataService') protected geoDataService: GeoDataService,
		protected fullValidatorDetector: FullValidatorDetector,
		@inject('JSONArchiver') protected jsonArchiver: JSONArchiver,
		@inject('HeartBeater') protected heartBeater: HeartBeater,
		protected notify: Notify,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async execute() {
		return new Promise((resolve, reject) => {
			this.run()
				.then(() => {
					if (this.loop) {
						setInterval(async () => {
							try {
								if (this.runState === RunState.idle) await this.run();
								else {
									this.exceptionLogger.captureException(
										new Error('Network update exceeding expected run time')
									);
								}
							} catch (e) {
								reject(e);
							}
						}, UpdateNetwork.UPDATE_RUN_TIME_MS);
					} else resolve(undefined);
				})
				.catch((reason) => reject(reason));
		});
	}

	protected async run() {
		this.logger.info('Starting new network update');
		const start = new Date();
		this.runState = RunState.updating;
		const updateResult = await this.updateNetwork();
		if (updateResult.isErr()) {
			this.exceptionLogger.captureException(updateResult.error);
			this.runState = RunState.idle;
			return; //don't persist this result and try again
		}
		if (this.dryRun) return;

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

	protected async updateNetwork(): Promise<Result<NetworkUpdateResult, Error>> {
		this.logger.info('Starting nodes crawl');
		const latestNetworkResult = await this.networkReadRepository.getNetwork(
			new Date()
		);
		if (latestNetworkResult.isErr()) return err(latestNetworkResult.error);

		if (latestNetworkResult.value === null) {
			return err(
				new Error('No network found in database, please use seed script')
			);
		}

		const crawlResult = await this.crawlerService.crawl(
			latestNetworkResult.value
		);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const networkUpdate = new NetworkUpdate(
			new Date(),
			crawlResult.value.processedLedgers
		);
		networkUpdate.latestLedger = crawlResult.value.latestClosedLedger.sequence;
		networkUpdate.latestLedgerCloseTime =
			crawlResult.value.latestClosedLedger.closeTime;
		const nodes = crawlResult.value.nodes;

		this.logger.info('Updating home domains');
		await this.homeDomainUpdater.updateHomeDomains(nodes);

		this.logger.info('Processing home domains');
		const tomlObjects = await this.tomlService.fetchTomlObjects(nodes);

		this.logger.info('Processing organizations & nodes from TOML');
		const organizations = latestNetworkResult.value.organizations;

		this.tomlService.updateOrganizationsAndNodes(
			tomlObjects,
			organizations,
			nodes
		);

		this.logger.info('Detecting full validators');
		await this.fullValidatorDetector.updateFullValidatorStatus(
			nodes,
			crawlResult.value.latestClosedLedger.sequence.toString()
		);

		if (crawlResult.value.nodesWithNewIP.length > 0) {
			this.logger.info('Updating geoData info', {
				nodes: crawlResult.value.nodesWithNewIP.map((node) => node.displayName)
			});
			await this.geoDataService.updateGeoData(crawlResult.value.nodesWithNewIP);
		}

		const network = new Network(
			nodes,
			organizations,
			networkUpdate.time,
			networkUpdate.latestLedger.toString()
		);
		this.logger.info('Calculating node indexes');
		const nodeIndex = new NodeIndex(network);
		nodes.forEach((node) => (node.index = nodeIndex.getIndex(node)));

		return ok({
			network: network,
			networkUpdate: networkUpdate
		});
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
		if (this.runState !== RunState.persisting) return callback();
		this.logger.info('Persisting update, will shutdown when ready');
		this.shutdownRequest = { callback: callback };
	}
}
