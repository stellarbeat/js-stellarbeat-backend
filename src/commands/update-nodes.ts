//@flow
import 'reflect-metadata';

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { TomlService } from '../index';
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
import { getConfigFromEnv } from '../config';
import { ExceptionLogger } from '../services/ExceptionLogger';
import { isString } from '../utilities/TypeGuards';

let isShuttingDown = false;
process.on('SIGTERM', shutdown('SIGTERM')).on('SIGINT', shutdown('SIGINT'));
const kernel = new Kernel();
// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
	const configResult = getConfigFromEnv();
	if (configResult.isErr()) {
		console.log('Invalid configuration');
		console.log(configResult.error.message);
		return;
	}

	const config = configResult.value;
	await kernel.initializeContainer(config);
	const crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
	const crawlerService = kernel.container.get(CrawlerService);
	const homeDomainUpdater = kernel.container.get(HomeDomainUpdater);
	const tomlService = kernel.container.get(TomlService);
	const geoDataService = kernel.container.get(GeoDataService);
	const fullValidatorDetector = kernel.container.get(FullValidatorDetector);
	const jsonArchiver = kernel.container.get<JSONArchiver>('JSONArchiver');
	const apiCacheClearer = kernel.container.get(APICacheClearer);
	const heartBeater = kernel.container.get<HeartBeater>('HeartBeater');
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			console.log('[MAIN] Crawl');
			//todo topTierFallback to config
			const crawlResult = await crawlerService.crawl(config.topTierFallback);

			if (crawlResult.isErr()) {
				console.log(
					'[MAIN] Error crawling, breaking off this run: ' +
						crawlResult.error.message
				);
				exceptionLogger.captureException(crawlResult.error);
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
				exceptionLogger.captureException(s3ArchivalResult.error);
				console.log(
					'[MAIN] JSON Archival failed: ' + s3ArchivalResult.error.message
				);
			}

			console.log('Clearing API Cache');
			const clearCacheResult = await apiCacheClearer.clearApiCache();
			if (clearCacheResult.isErr()) {
				exceptionLogger.captureException(clearCacheResult.error);
				console.log(
					'[MAIN] Clearing of API Cache failed: ' +
						clearCacheResult.error.message
				);
			}

			console.log('Trigger heartbeat');
			const heartbeatResult = await heartBeater.tick();
			if (heartbeatResult.isErr()) {
				exceptionLogger.captureException(heartbeatResult.error);
				console.log(
					'[MAIN] Heartbeat failed: ' + heartbeatResult.error.message
				);
			}

			if (!config.loop) {
				console.log('Shutting down crawler');
				break;
			}
			console.log('end of backend run');
		} catch (e) {
			const errorMsg = 'MAIN: uncaught error, starting new crawl';
			if (e instanceof Error) {
				console.log(errorMsg + ': ' + e.message);
				exceptionLogger.captureException(e);
			} else if (isString(e)) {
				console.log(errorMsg + ': ' + e);
			} else console.log(errorMsg);
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
