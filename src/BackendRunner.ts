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
import { Node, Organization, PublicKey } from '@stellarbeat/js-stellar-domain';

export type UpdateResult = {
	nodes: Node[];
	organizations: Organization[];
	crawl: CrawlV2;
};

@injectable()
export class BackendRunner {
	constructor(
		protected crawlResultProcessor: CrawlResultProcessor,
		protected crawlerService: CrawlerService,
		protected homeDomainUpdater: HomeDomainUpdater,
		protected tomlService: TomlService,
		@inject('GeoDataService') protected geoDataService: GeoDataService,
		protected fullValidatorDetector: FullValidatorDetector,
		@inject('JSONArchiver') protected jsonArchiver: JSONArchiver,
		protected apiCacheClearer: APICacheClearer,
		@inject('HeartBeater') protected heartBeater: HeartBeater,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {
		this.crawlResultProcessor = crawlResultProcessor;
		this.crawlerService = crawlerService;
		this.homeDomainUpdater = homeDomainUpdater;
		this.tomlService = tomlService;
		this.geoDataService = geoDataService;
		this.fullValidatorDetector = fullValidatorDetector;
		this.jsonArchiver = jsonArchiver;
		this.apiCacheClearer = apiCacheClearer;
		this.heartBeater = heartBeater;
		this.exceptionLogger = exceptionLogger;
	}

	//todo move topTierFallback to constructor
	async updateNodesAndOrganizations(
		topTierFallback: PublicKey[]
	): Promise<Result<UpdateResult, Error>> {
		console.log('[MAIN] Crawl');
		const crawlResult = await this.crawlerService.crawl(topTierFallback);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const crawl = new CrawlV2(new Date(), crawlResult.value.processedLedgers);
		crawl.latestLedger = crawlResult.value.latestClosedLedger.sequence;
		crawl.latestLedgerCloseTime =
			crawlResult.value.latestClosedLedger.closeTime;
		const nodes = crawlResult.value.nodes;
		console.log('[MAIN] Updating home domains');
		await this.homeDomainUpdater.updateHomeDomains(nodes);

		console.log('[MAIN] Processing node TOML Files');
		const tomlObjects = await this.tomlService.fetchTomlObjects(nodes);

		console.log('[MAIN] Processing organizations & nodes from TOML');
		const organizations = this.tomlService.processTomlObjects(
			tomlObjects,
			crawlResult.value.organizations,
			nodes
		);

		console.log('[MAIN] Detecting full validators');
		await this.fullValidatorDetector.updateFullValidatorStatus(
			nodes,
			crawlResult.value.latestClosedLedger.sequence.toString()
		);

		console.log(
			'[MAIN] Starting geo data fetch for nodes: ' +
				crawlResult.value.nodesWithNewIP.map((node) => node.displayName)
		);
		await this.geoDataService.updateGeoData(crawlResult.value.nodesWithNewIP);

		return ok({
			nodes: nodes,
			organizations: organizations,
			crawl: crawl
		});
	}

	async persistUpdateResults(
		crawl: CrawlV2,
		nodes: Node[],
		organizations: Organization[]
	): Promise<Result<undefined, Error>> {
		console.log('[MAIN] Update snapshots and save measurements');
		const processCrawlResult = await this.crawlResultProcessor.processCrawl(
			crawl,
			nodes,
			organizations
		);
		if (processCrawlResult.isErr()) return err(processCrawlResult.error);

		console.log('[MAIN] JSON Archival');
		const s3ArchivalResult = await this.jsonArchiver.archive(
			nodes,
			organizations,
			crawl.time
		);
		if (s3ArchivalResult.isErr()) {
			return err(s3ArchivalResult.error);
		}

		console.log('Clearing API Cache');
		const clearCacheResult = await this.apiCacheClearer.clearApiCache();
		if (clearCacheResult.isErr()) {
			return err(clearCacheResult.error);
		}

		console.log('Trigger heartbeat');
		const heartbeatResult = await this.heartBeater.tick();
		if (heartbeatResult.isErr()) {
			return err(heartbeatResult.error);
		}

		return ok(undefined);
	}
}
