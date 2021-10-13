import { err, ok, Result } from 'neverthrow';
import CrawlV2 from './entities/CrawlV2';
import { inject, injectable } from 'inversify';
import { CrawlResultProcessor } from './services/CrawlResultProcessor';
import { CrawlerService } from './services/CrawlerService';
import { HomeDomainUpdater } from './services/HomeDomainUpdater';
import { TomlService } from './services/TomlService';
import { GeoDataService } from './services/IpStackGeoDataService';
import { FullValidatorDetector } from './services/FullValidatorDetector';
import { JSONArchiver } from './services/S3Archiver';
import { APICacheClearer } from './services/APICacheClearer';
import { HeartBeater } from './services/DeadManSnitchHeartBeater';
import { ExceptionLogger } from './services/ExceptionLogger';
import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import { Logger } from './services/PinoLogger';
import NetworkService from './services/NetworkService';

export type NetworkUpdateResult = {
	nodes: Node[];
	organizations: Organization[];
	crawl: CrawlV2;
};

enum RunState {
	idle,
	updating,
	persisting
}

@injectable()
export class NetworkUpdater {
	protected shutdownRequest?: {
		callback: () => void;
	};

	protected runState: RunState = RunState.idle;

	constructor(
		protected loop = false,
		protected networkService: NetworkService,
		protected crawlResultProcessor: CrawlResultProcessor,
		protected crawlerService: CrawlerService,
		protected homeDomainUpdater: HomeDomainUpdater,
		protected tomlService: TomlService,
		@inject('GeoDataService') protected geoDataService: GeoDataService,
		protected fullValidatorDetector: FullValidatorDetector,
		@inject('JSONArchiver') protected jsonArchiver: JSONArchiver,
		protected apiCacheClearer: APICacheClearer,
		@inject('HeartBeater') protected heartBeater: HeartBeater,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async run() {
		if (this.runState !== RunState.idle)
			//todo: could be expanded to allow concurrent runs by storing all runStates and taking them into account for safe shutdown
			throw new Error('Already running');
		do {
			this.logger.info('Starting new network update');
			const start = new Date();
			this.runState = RunState.updating;
			const updateResult = await this.updateNetwork();
			if (updateResult.isErr()) {
				this.logger.error('Error updating network', {
					error: updateResult.error.message
				});
				this.exceptionLogger.captureException(updateResult.error);
				continue; //don't persist this result and try again
			}

			this.runState = RunState.persisting;
			const persistResult = await this.persistNetworkUpdateResults(
				updateResult.value.crawl,
				updateResult.value.nodes,
				updateResult.value.organizations
			);

			if (persistResult.isErr()) {
				this.logger.error('Error persisting network update', {
					error: persistResult.error.message
				});
				this.exceptionLogger.captureException(persistResult.error);
			}

			if (this.shutdownRequest) this.shutdownRequest.callback();

			const end = new Date();
			const runningTime = end.getTime() - start.getTime();
			this.logger.info('Network successfully updated', {
				'runtime(ms)': runningTime
			});
		} while (this.loop);

		this.runState = RunState.idle;
	}

	protected async updateNetwork(): Promise<Result<NetworkUpdateResult, Error>> {
		this.logger.info('Starting nodes crawl');
		const latestNetworkResult = await this.networkService.getNetwork(
			new Date()
		);

		if (latestNetworkResult.isErr()) {
			return err(latestNetworkResult.error);
		}

		const latestNetwork = latestNetworkResult.value;

		const crawlResult = await this.crawlerService.crawl(latestNetwork);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const crawl = new CrawlV2(new Date(), crawlResult.value.processedLedgers);
		crawl.latestLedger = crawlResult.value.latestClosedLedger.sequence;
		crawl.latestLedgerCloseTime =
			crawlResult.value.latestClosedLedger.closeTime;
		const nodes = crawlResult.value.nodes;

		this.logger.info('Updating home domains');
		await this.homeDomainUpdater.updateHomeDomains(nodes);

		this.logger.info('Processing home domains');
		const tomlObjects = await this.tomlService.fetchTomlObjects(nodes);

		this.logger.info('Processing organizations & nodes from TOML');
		const organizations = this.tomlService.processTomlObjects(
			tomlObjects,
			latestNetwork.organizations,
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

		return ok({
			previousNetwork: latestNetwork,
			nodes: nodes,
			organizations: organizations,
			crawl: crawl
		});
	}

	protected async persistNetworkUpdateResults(
		crawl: CrawlV2,
		nodes: Node[],
		organizations: Organization[]
	): Promise<Result<undefined, Error>> {
		this.logger.info('Persisting network update');
		const processCrawlResult = await this.crawlResultProcessor.processCrawl(
			crawl,
			nodes,
			organizations
		);
		if (processCrawlResult.isErr()) return err(processCrawlResult.error);

		this.logger.info('JSON Archival');
		const s3ArchivalResult = await this.jsonArchiver.archive(
			nodes,
			organizations,
			crawl.time
		);
		if (s3ArchivalResult.isErr()) {
			return err(s3ArchivalResult.error);
		}

		this.logger.info('Clearing API Cache');
		const clearCacheResult = await this.apiCacheClearer.clearApiCache();
		if (clearCacheResult.isErr()) {
			return err(clearCacheResult.error);
		}

		this.logger.info('Trigger heartbeat');
		const heartbeatResult = await this.heartBeater.tick();
		if (heartbeatResult.isErr()) {
			return err(heartbeatResult.error);
		}

		return ok(undefined);
	}

	public shutDown(callback: () => void) {
		if (this.runState !== RunState.persisting) return callback();
		this.logger.info('Persisting update, will shutdown when ready');
		this.shutdownRequest = { callback: callback };
	}
}
