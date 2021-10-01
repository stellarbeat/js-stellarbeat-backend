//@flow
import 'reflect-metadata';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import { TomlService } from '../index';
import { NodeIndex, Network } from '@stellarbeat/js-stellar-domain';
import * as Sentry from '@sentry/node';
import { CrawlerService } from '../services/CrawlerService';
import Kernel from '../Kernel';
import { CrawlResultProcessor } from '../services/CrawlResultProcessor';
import CrawlV2 from '../entities/CrawlV2';
import { HomeDomainUpdater } from '../services/HomeDomainUpdater';
import { GeoDataService } from '../services/GeoDataService';
import { FullValidatorDetector } from '../services/FullValidatorDetector';
import { JSONArchiver } from '../services/S3Archiver';
import { APICacheClearer } from '../services/APICacheClearer';
import { HeartBeater } from '../services/DeadManSnitchHeartBeater';

if (process.env.NODE_ENV === 'production') {
	Sentry.init({ dsn: process.env.SENTRY_DSN });
}

let isShuttingDown = false;
process.on('SIGTERM', shutdown('SIGTERM')).on('SIGINT', shutdown('SIGINT'));
const kernel = new Kernel();
// noinspection JSIgnoredPromiseFromCall
try {
	run();
} catch (e) {
	console.log('MAIN: uncaught error, shutting down: ' + e);
	Sentry.captureException(e);
	process.exit(0);
}

async function run() {
	await kernel.initializeContainer();
	const crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
	const crawlService = kernel.container.get(CrawlerService);
	const topTierFallbackConfig = process.env.TOP_TIER_FALLBACK;
	const homeDomainUpdater = kernel.container.get(HomeDomainUpdater);
	const tomlService = kernel.container.get(TomlService);
	const geoDataService = kernel.container.get(GeoDataService);
	const fullValidatorDetector = kernel.container.get(FullValidatorDetector);
	const jsonArchiver = kernel.container.get<JSONArchiver>('JSONArchiver');
	const apiCacheClearer = kernel.container.get(APICacheClearer);
	const heartBeater = kernel.container.get<HeartBeater>('HeartBeater');

	const topTierFallbackNodes =
		typeof topTierFallbackConfig === 'string'
			? topTierFallbackConfig.split(' ')
			: [];

	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			console.log('[MAIN] Crawl');
			const crawlResult = await crawlService.crawl(topTierFallbackNodes);

			if (crawlResult.isErr()) {
				console.log(
					'[MAIN] Error crawling, breaking off this run: ' +
						crawlResult.error.message
				);
				Sentry.captureException(crawlResult.error);
				continue;
			}

			const nodes = crawlResult.value.nodes;
			console.log('[MAIN] Updating home domains');
			await homeDomainUpdater.updateHomeDomains(nodes);

			console.log('[MAIN] Processing node TOML Files');
			const tomlObjects = await tomlService.fetchTomlObjects(nodes);

			console.log('[MAIN] Processing organizations & nodes from TOML');
			const organizations = tomlService.processTomlObjects(
				tomlObjects,
				crawlResult.value.organizations,
				nodes
			);

			console.log('[MAIN] Detecting full validators');
			await fullValidatorDetector.updateFullValidatorStatus(
				nodes,
				crawlResult.value.latestClosedLedger.sequence.toString()
			);

			console.log(
				'[MAIN] Starting geo data fetch for nodes: ' +
					crawlResult.value.nodesWithNewIP.map((node) => node.displayName)
			);
			await geoDataService.updateGeoData(crawlResult.value.nodesWithNewIP);

			console.log('[MAIN] Calculating node index'); //move to statistics processing
			const nodeIndex = new NodeIndex(new Network(nodes));
			nodes.forEach((node) => (node.index = nodeIndex.getIndex(node)));

			if (isShuttingDown) {
				//don't save anything to db to avoid corrupting a crawl
				console.log('shutting down');
				process.exit(0);
			}

			const crawlV2 = new CrawlV2(
				new Date(),
				crawlResult.value.processedLedgers
			);
			crawlV2.latestLedger = crawlResult.value.latestClosedLedger.sequence;
			crawlV2.latestLedgerCloseTime =
				crawlResult.value.latestClosedLedger.closeTime;

			const processCrawlResult = await crawlResultProcessor.processCrawl(
				crawlV2,
				nodes,
				organizations
			);
			if (processCrawlResult.isErr())
				//@ts-ignore
				throw processCrawlResult.error;

			console.log('[MAIN] JSON Archival');
			const s3ArchivalResult = await jsonArchiver.archive(
				nodes,
				organizations,
				crawlV2.time
			);
			if (s3ArchivalResult.isErr()) {
				Sentry.captureException(s3ArchivalResult.error);
				console.log(
					'[MAIN] JSON Archival failed: ' + s3ArchivalResult.error.message
				);
			}

			console.log('Clearing API Cache');
			const clearCacheResult = await apiCacheClearer.clearApiCache();
			if (clearCacheResult.isErr()) {
				Sentry.captureException(clearCacheResult.error);
				console.log(
					'[MAIN] Clearing of API Cache failed: ' +
						clearCacheResult.error.message
				);
			}

			console.log('Trigger heartbeat');
			const heartbeatResult = await heartBeater.tick();
			if (heartbeatResult.isErr()) {
				Sentry.captureException(heartbeatResult.isErr());
				console.log(
					'[MAIN] Heartbeat failed: ' + heartbeatResult.error.message
				);
			}

			if (!process.env.LOOP) {
				console.log('Shutting down crawler');
				break;
			}
			console.log('end of backend run');
		} catch (e) {
			console.log('MAIN: uncaught error, starting new crawl: ' + e);
			Sentry.captureException(e);
		}
	}
}

function shutdown(signal: string) {
	return () => {
		console.log(`${signal}...`);
		isShuttingDown = true;
		setTimeout(() => {
			console.log('...waited 30s, exiting.');
			process.exit(0);
		}, 30000).unref();
	};
}
