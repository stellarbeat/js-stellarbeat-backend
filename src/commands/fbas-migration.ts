import Kernel from "../Kernel";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import NodeSnapShotter from "../services/SnapShotting/NodeSnapShotter";
import {NodeMeasurementV2Repository} from "../repositories/NodeMeasurementV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationSnapShotter from "../services/SnapShotting/OrganizationSnapShotter";
import {OrganizationMeasurementRepository} from "../repositories/OrganizationMeasurementRepository";
import {Network} from "@stellarbeat/js-stellar-domain";
import NetworkMeasurement from "../entities/NetworkMeasurement";
import FbasAnalyzerService from "../services/FbasAnalyzerService";
import {Connection} from "typeorm";
import MeasurementsRollupService from "../services/MeasurementsRollupService";

// noinspection JSIgnoredPromiseFromCall
main();

let fbasAnalyzerService: FbasAnalyzerService;

async function main() {
    let kernel = new Kernel();
    await kernel.initializeContainer();
    fbasAnalyzerService = kernel.container.get(FbasAnalyzerService)
    let crawlId = 1;
    let crawl = await getCrawl(kernel, crawlId);//todo fetch from rollup

    while(crawl !== undefined) {
        console.log("processing crawl with id: " + crawl.id);
        if(crawl.completed)
            await processCrawl(kernel, crawl);
        else
            console.log("uncompleted crawl! skipping!");
        crawlId++;
        crawl = await getCrawl(kernel, crawlId);
    }
}

async function processCrawl(kernel:Kernel, crawl:CrawlV2){
    let nodes = await getNodes(kernel, crawl);
    let organizations = await getOrganizations(kernel, crawl);

    let network = new Network(nodes, organizations);
    let networkMeasurement = new NetworkMeasurement(crawl.time);

    let analysisResult = fbasAnalyzerService.performAnalysis(network);

    networkMeasurement.hasQuorumIntersection = analysisResult.has_quorum_intersection;
    networkMeasurement.hasQuorumIntersectionFiltered = analysisResult.has_quorum_intersection_faulty_nodes_filtered;
    networkMeasurement.minBlockingSetSize = analysisResult.minimal_blocking_sets.length > 0 ? analysisResult.minimal_blocking_sets[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetFilteredSize = analysisResult.minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetOrgsSize = analysisResult.org_minimal_blocking_sets.length > 0 ? analysisResult.org_minimal_blocking_sets[0].length : 0; //results ordered by size
    networkMeasurement.minBlockingSetOrgsFilteredSize = analysisResult.org_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.org_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetSize = analysisResult.minimal_splitting_sets.length > 0 ? analysisResult.minimal_splitting_sets[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetFilteredSize = analysisResult.minimal_splitting_sets_faulty_nodes_filtered.length > 0 ? analysisResult.minimal_splitting_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetOrgsSize = analysisResult.org_minimal_splitting_sets.length > 0 ? analysisResult.org_minimal_splitting_sets[0].length : 0; //results ordered by size
    networkMeasurement.minSplittingSetOrgsFilteredSize = analysisResult.org_minimal_splitting_sets_faulty_nodes_filtered.length > 0 ? analysisResult.org_minimal_splitting_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
    networkMeasurement.topTierSize = analysisResult.top_tier.length;
    networkMeasurement.topTierFilteredSize = analysisResult.top_tier_faulty_nodes_filtered.length;
    networkMeasurement.topTierOrgsSize = analysisResult.org_top_tier.length;
    networkMeasurement.topTierOrgsFilteredSize = analysisResult.org_top_tier_faulty_nodes_filtered.length;
    networkMeasurement.nrOfActiveWatchers = network.nodes.filter(node => !node.isValidator && node.active).length;
    networkMeasurement.nrOfActiveValidators = network.nodes.filter(node => node.active && node.isValidating && !network.isNodeFailing(node)).length;
    networkMeasurement.nrOfActiveFullValidators = network.nodes.filter(node => node.isFullValidator && !network.isNodeFailing(node)).length;
    networkMeasurement.nrOfActiveOrganizations = network.organizations.filter(organization => !network.isOrganizationFailing(organization)).length; //should take into account failing organizations
    networkMeasurement.transitiveQuorumSetSize = network.graph.networkTransitiveQuorumSet.size;

    await kernel.container.get(Connection).manager.insert(NetworkMeasurement, networkMeasurement);
    await kernel.container.get(MeasurementsRollupService).rollupNetworkMeasurements(crawl);
}
async function getCrawl(kernel:Kernel, id:number) {
    let crawlRepo = kernel.container.get(CrawlV2Repository);
    return await crawlRepo.findOne(id);
}

async function getOrganizations(kernel:Kernel, crawl:CrawlV2) {
    let activeSnapShots = await kernel.container.get(OrganizationSnapShotter).findSnapShotsActiveAtTime(crawl.time);
    let measurements = await kernel.container.get(OrganizationMeasurementRepository).find({
        where: {
            time: crawl.time
        }
    });
    let measurementsMap = new Map(measurements.map(measurement => {
        return [measurement.organizationIdStorage.organizationId, measurement]
    }));

    //@ts-ignore
    return activeSnapShots.map(snapShot => snapShot.toOrganization(crawl.time, measurementsMap.get(snapShot.organizationIdStorage.organizationId)));
}

async function getNodes(kernel:Kernel, crawl:CrawlV2) {
    let activeSnapShots = await kernel.container.get(NodeSnapShotter).findSnapShotsActiveAtTime(crawl.time);
    let measurements = await kernel.container.get(NodeMeasurementV2Repository).find({
        where: {
            time: crawl.time
        }
    });
    let measurementsMap = new Map(measurements.map(measurement => {
        return [measurement.nodePublicKeyStorage.publicKey, measurement]
    }));

    //@ts-ignore
    return activeSnapShots.map(snapShot => snapShot.toNode(crawl.time, measurementsMap.get(snapShot.nodePublicKey.publicKey)));
}