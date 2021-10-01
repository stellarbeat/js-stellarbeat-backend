import Kernel from '../Kernel';
import { CrawlV2Repository } from '../repositories/CrawlV2Repository';
import NodeSnapShotter from '../services/SnapShotting/NodeSnapShotter';
import { NodeMeasurementV2Repository } from '../repositories/NodeMeasurementV2Repository';
import CrawlV2 from '../entities/CrawlV2';
import OrganizationSnapShotter from '../services/SnapShotting/OrganizationSnapShotter';
import { OrganizationMeasurementRepository } from '../repositories/OrganizationMeasurementRepository';
import { Network } from '@stellarbeat/js-stellar-domain';
import NetworkMeasurement from '../entities/NetworkMeasurement';
import FbasAnalyzerService from '../services/FbasAnalyzerService';
import { Connection, getRepository, Repository } from 'typeorm';
import { NetworkMeasurementRepository } from '../repositories/NetworkMeasurementRepository';
import NetworkMeasurementUpdate from '../entities/NetworkMeasurementUpdate';

if (process.argv.length <= 2 || isNaN(parseInt(process.argv[2]))) {
	console.log(
		'Usage: ' +
			__filename +
			'network_measurement_update_id (to retrieve from db)'
	);

	process.exit(-1);
}

let updateId = parseInt(process.argv[2]);

// noinspection JSIgnoredPromiseFromCall
main();

let fbasAnalyzerService: FbasAnalyzerService;
let networkMeasurementUpdateRepository: Repository<NetworkMeasurementUpdate>;
let isShuttingDown = false;

let saveQueue: NetworkMeasurement[] = [];

process.on('SIGTERM', shutdown('SIGTERM')).on('SIGINT', shutdown('SIGINT'));

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

async function main() {
	let kernel = new Kernel();
	await kernel.initializeContainer();
	fbasAnalyzerService = kernel.container.get(FbasAnalyzerService);
	networkMeasurementUpdateRepository = getRepository(NetworkMeasurementUpdate);
	let update = await networkMeasurementUpdateRepository.findOne(updateId);
	if (!update) {
		console.log('Not a valid updateId: ' + updateId);
		return;
	}

	let crawlId = update.startCrawlId;
	let endCrawlId = update.endCrawlId;

	let crawl = await getCrawl(kernel, crawlId); //todo fetch from rollup
	if (!crawl) {
		console.log('Not a valid start crawlID: ' + crawlId);
		return;
	}

	while (crawlId <= endCrawlId) {
		console.time('full');
		console.log('processing crawl with id: ' + crawlId);
		if (crawl && crawl.completed) {
			await processCrawl(kernel, crawl);
		} else {
			console.log('Invalid crawl! skipping!');
		}

		if (isShuttingDown) {
			//canceled by user
			console.log('Ended update with crawl (included): ' + crawlId);
			break;
		}

		crawlId++;
		crawl = await getCrawl(kernel, crawlId);
		console.timeEnd('full');
	}

	//flushing queue
	await kernel.container
		.get(Connection)
		.manager.save(NetworkMeasurement, saveQueue);

	console.log('updating start crawl id for next run: ' + crawlId);
	update.startCrawlId = crawlId;
	await networkMeasurementUpdateRepository.save(update);
}

async function processCrawl(kernel: Kernel, crawl: CrawlV2) {
	let nodes = await getNodes(kernel, crawl);
	let organizations = await getOrganizations(kernel, crawl);

	let network = new Network(nodes, organizations);
	let networkMeasurement = await getNetworkMeasurement(kernel, crawl);
	if (!networkMeasurement) {
		console.log('Warning: no measurement found at time: ' + crawl.time);
		networkMeasurement = new NetworkMeasurement(crawl.time);
	}
	console.log('starting analysis');
	let analysisResult = fbasAnalyzerService.performAnalysis(network);

	console.log(analysisResult);
	/*networkMeasurement.hasQuorumIntersection = analysisResult.has_quorum_intersection;
    networkMeasurement.hasSymmetricTopTier = analysisResult.has_symmetric_top_tier;
    networkMeasurement.minBlockingSetSize = analysisResult.minimal_blocking_sets.length > 0 ? analysisResult.minimal_blocking_sets[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetFilteredSize = analysisResult.minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetOrgsSize = analysisResult.org_minimal_blocking_sets.length > 0 ? analysisResult.org_minimal_blocking_sets[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetOrgsFilteredSize = analysisResult.org_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.org_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetISPSize = analysisResult.isp_minimal_blocking_sets.length > 0 ? analysisResult.isp_minimal_blocking_sets[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetISPFilteredSize = analysisResult.isp_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.isp_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetCountrySize = analysisResult.org_minimal_blocking_sets.length > 0 ? analysisResult.org_minimal_blocking_sets[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetCountryFilteredSize = analysisResult.country_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.country_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetSize = analysisResult.minimal_splitting_sets.length > 0 ? analysisResult.minimal_splitting_sets[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetOrgsSize = analysisResult.org_minimal_splitting_sets.length > 0 ? analysisResult.org_minimal_splitting_sets[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetCountrySize = analysisResult.country_minimal_splitting_sets.length > 0 ? analysisResult.country_minimal_splitting_sets[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetISPSize = analysisResult.isp_minimal_splitting_sets.length > 0 ? analysisResult.isp_minimal_splitting_sets[0].length : 0; //results ordered by size
    networkMeasurement.topTierSize = analysisResult.top_tier.length;
    networkMeasurement.topTierOrgsSize = analysisResult.org_top_tier.length;
    networkMeasurement.nrOfActiveWatchers = network.networkStatistics.nrOfActiveWatchers;
    networkMeasurement.nrOfActiveValidators = network.networkStatistics.nrOfActiveValidators;
    networkMeasurement.nrOfActiveFullValidators = network.networkStatistics.nrOfActiveFullValidators;
    networkMeasurement.nrOfActiveOrganizations = network.networkStatistics.nrOfActiveOrganizations;
    networkMeasurement.transitiveQuorumSetSize = network.networkStatistics.transitiveQuorumSetSize;
    networkMeasurement.hasTransitiveQuorumSet = network.networkStatistics.hasTransitiveQuorumSet;
     */
	saveQueue.push(networkMeasurement);
	if (saveQueue.length > 50) {
		await kernel.container
			.get(Connection)
			.manager.save(NetworkMeasurement, saveQueue);
		saveQueue = [];
	}
}

async function getCrawl(kernel: Kernel, id: number) {
	let crawlRepo = kernel.container.get(CrawlV2Repository);
	let crawl = await crawlRepo.findOne(id);
	return crawl;
}

async function getOrganizations(kernel: Kernel, crawl: CrawlV2) {
	let activeSnapShots = await kernel.container
		.get(OrganizationSnapShotter)
		.findSnapShotsActiveAtTime(crawl.time);
	let measurements = await kernel.container
		.get(OrganizationMeasurementRepository)
		.find({
			where: {
				time: crawl.time
			}
		});
	let measurementsMap = new Map(
		measurements.map((measurement) => {
			return [measurement.organizationIdStorage.organizationId, measurement];
		})
	);

	//@ts-ignore
	return activeSnapShots.map((snapShot) =>
		snapShot.toOrganization(
			crawl.time,
			measurementsMap.get(snapShot.organizationIdStorage.organizationId)
		)
	);
}

async function getNodes(kernel: Kernel, crawl: CrawlV2) {
	let activeSnapShots = await kernel.container
		.get(NodeSnapShotter)
		.findSnapShotsActiveAtTime(crawl.time);
	let measurements = await kernel.container
		.get(NodeMeasurementV2Repository)
		.find({
			where: {
				time: crawl.time
			}
		});
	let measurementsMap = new Map(
		measurements.map((measurement) => {
			return [measurement.nodePublicKeyStorage.publicKey, measurement];
		})
	);

	//@ts-ignore
	return activeSnapShots.map((snapShot) =>
		snapShot.toNode(
			crawl.time,
			measurementsMap.get(snapShot.nodePublicKey.publicKey)
		)
	);
}

async function getNetworkMeasurement(kernel: Kernel, crawl: CrawlV2) {
	let measurement = await kernel.container
		.get(NetworkMeasurementRepository)
		.findOne({ where: { time: crawl.time } });
	return measurement;
}
