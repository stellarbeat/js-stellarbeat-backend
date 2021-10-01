//@flow
import 'reflect-metadata';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import { HistoryService, TomlService } from '../index';
import { Node, NodeIndex, Network } from '@stellarbeat/js-stellar-domain';
import axios from 'axios';
import * as AWS from 'aws-sdk';
import * as Sentry from '@sentry/node';
import { CrawlerService } from '../services/CrawlerService';
import Kernel from '../Kernel';
import { CrawlResultProcessor } from '../services/CrawlResultProcessor';
import CrawlV2 from '../entities/CrawlV2';
import { HomeDomainUpdater } from '../services/HomeDomainUpdater';

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
	const historyService = kernel.container.get(HistoryService);

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
			await updateFullValidatorStatus(
				nodes,
				historyService,
				crawlResult.value.latestClosedLedger.sequence.toString()
			);

			console.log('[MAIN] Starting geo data fetch');
			await fetchGeoData(crawlResult.value.nodesWithNewIP);

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

			console.log('[MAIN] Archive to S3');
			await archiveToS3(nodes, crawlV2.time);
			console.log('[MAIN] Archive to S3 completed');

			const backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
			const backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;

			if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
				throw 'Backend cache not configured';
			}

			try {
				console.log('[MAIN] clearing api cache');
				const source = axios.CancelToken.source();
				setTimeout(() => {
					source.cancel('Connection time-out');
					// Timeout Logic
				}, 2050);
				await axios.get(
					backendApiClearCacheUrl + '?token=' + backendApiClearCacheToken,
					{
						cancelToken: source.token,
						timeout: 2000,
						headers: { 'User-Agent': 'stellarbeat.io' }
					}
				);
				console.log('[MAIN] api cache cleared');
			} catch (e) {
				Sentry.captureException(e);
				console.log('[MAIN] Error clearing api cache: ' + e);
			}

			try {
				const deadManSwitchUrl = process.env.DEADMAN_URL;
				if (deadManSwitchUrl) {
					console.log('[MAIN] Contacting deadmanswitch');
					const source = axios.CancelToken.source();
					setTimeout(() => {
						source.cancel('Connection time-out');
						// Timeout Logic
					}, 2050);
					await axios.get(deadManSwitchUrl!, {
						cancelToken: source.token,
						timeout: 2000,
						headers: { 'User-Agent': 'stellarbeat.io' }
					});
				}
			} catch (e) {
				Sentry.captureException(e);
				console.log('[MAIN] Error contacting deadmanswitch: ' + e);
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

async function fetchGeoData(nodes: Node[]) {
	console.log('[MAIN]: Fetching geo data of ' + nodes.length + ' nodes');

	await Promise.all(
		nodes.map(async (node: Node) => {
			try {
				console.log('[MAIN] Updating geodata for: ' + node.displayName);

				const accessKey = process.env.IPSTACK_ACCESS_KEY;
				if (!accessKey) {
					throw new Error('ERROR: ipstack not configured');
				}

				const url =
					'https://api.ipstack.com/' + node.ip + '?access_key=' + accessKey;
				const source = axios.CancelToken.source();
				setTimeout(() => {
					source.cancel('Connection time-out');
					// Timeout Logic
				}, 2050);
				const geoDataResponse = await axios.get(url, {
					cancelToken: source.token,
					timeout: 2000,
					headers: { 'User-Agent': 'stellarbeat.io' }
				});
				const geoData = geoDataResponse.data;

				if (geoData.error && geoData.success === false)
					throw new Error(geoData.error.type);

				if (geoData.longitude === null || geoData.latitude === null)
					throw new Error('Longitude or latitude has null value');

				node.geoData.countryCode = geoData.country_code;
				node.geoData.countryName = geoData.country_name;
				node.geoData.regionCode = geoData.region_code;
				node.geoData.regionName = geoData.region_name;
				node.geoData.city = geoData.city;
				node.geoData.zipCode = geoData.zip_code;
				node.geoData.timeZone = geoData.time_zone;
				node.geoData.latitude = geoData.latitude;
				node.geoData.longitude = geoData.longitude;
				node.geoData.metroCode = geoData.metro_code;
				node.isp = geoData.connection.isp;
			} catch (e) {
				let errorMessage =
					'[MAIN] error updating geodata for: ' + node.displayName;
				if (e instanceof Error) {
					errorMessage = errorMessage + ': ' + e.message;
				}
				console.log(errorMessage);
			}
		})
	);
}

async function archiveToS3(nodes: Node[], time: Date): Promise<void> {
	try {
		const accessKeyId = process.env.AWS_ACCESS_KEY;
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
		const bucketName = process.env.AWS_BUCKET_NAME;
		const environment = process.env.NODE_ENV;
		if (!accessKeyId) {
			throw new Error('[MAIN] Not archiving, s3 not configured');
		}

		const params = {
			Bucket: bucketName,
			Key:
				environment +
				'/' +
				time.getFullYear() +
				'/' +
				time.toLocaleString('en-us', { month: 'short' }) +
				'/' +
				time.toISOString() +
				'.json',
			Body: JSON.stringify(nodes)
		};

		const s3 = new AWS.S3({
			accessKeyId: accessKeyId,
			secretAccessKey: secretAccessKey
		});

		await s3.upload(params as any).promise();
	} catch (e) {
		console.log('[MAIN] error archiving to S3');
	}
}

async function updateFullValidatorStatus(
	nodes: Node[],
	historyService: HistoryService,
	latestLedger: string
) {
	for (const index in nodes) {
		const node = nodes[index];
		try {
			if (!node.historyUrl) {
				node.isFullValidator = false;
				continue;
			}
			node.isFullValidator = await historyService.stellarHistoryIsUpToDate(
				node.historyUrl,
				latestLedger
			);
		} catch (e) {
			console.log(
				'Info: failed checking history for: ' +
					node.displayName +
					(e instanceof Error ? ': ' + e.message : '')
			);
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
