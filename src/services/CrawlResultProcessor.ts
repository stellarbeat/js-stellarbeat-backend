import {Network, Node, Organization, PublicKey} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import {Connection} from "typeorm";
import NodeMeasurementV2 from "../entities/NodeMeasurementV2";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import OrganizationMeasurement from "../entities/OrganizationMeasurement";
import OrganizationSnapShotter from "./SnapShotting/OrganizationSnapShotter";
import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";
import NetworkMeasurement from "../entities/NetworkMeasurement";
import MeasurementsRollupService from "./MeasurementsRollupService";
import Archiver from "./Archiver";
import * as Sentry from "@sentry/node";
import {injectable} from "inversify";
import FbasAnalyzerService, {AnalysisResult} from "./FbasAnalyzerService";
import {FbasError} from "../errors/FbasError";

export interface ICrawlResultProcessor {
    processCrawl(crawl: CrawlV2, nodes: Node[], organizations: Organization[], ledgers: number[]): Promise<CrawlV2>;
}

@injectable()
export class CrawlResultProcessor implements ICrawlResultProcessor {
    protected crawlRepository: CrawlV2Repository;
    protected organizationSnapShotter: OrganizationSnapShotter;
    protected nodeSnapShotter: NodeSnapShotter;
    protected connection: Connection; //todo repositories & transaction
    protected measurementRollupService: MeasurementsRollupService;
    protected archiver: Archiver;
    protected fbasAnalyzer:FbasAnalyzerService;

    constructor(
        crawlRepository: CrawlV2Repository,
        nodeSnapShotter: NodeSnapShotter,
        organizationSnapShotter: OrganizationSnapShotter,
        measurementRollupService: MeasurementsRollupService,
        archiver: Archiver,
        connection: Connection,
        fbasAnalyzer: FbasAnalyzerService
        ) {
        this.crawlRepository = crawlRepository;
        this.nodeSnapShotter = nodeSnapShotter;
        this.connection = connection;
        this.organizationSnapShotter = organizationSnapShotter;
        this.measurementRollupService = measurementRollupService;
        this.archiver = archiver;
        this.fbasAnalyzer = fbasAnalyzer;
    }

    async processCrawl(crawl: CrawlV2, nodes: Node[], organizations: Organization[]) {

        await this.crawlRepository.save(crawl);
       /*
        Step 1: Create or update the active snapshots
         */
        console.time("org");
        let activeOrganizationSnapShots = await this.organizationSnapShotter.updateOrCreateSnapShots(organizations, crawl);
        console.timeEnd("org");

        console.time("node");
        let activeSnapShots = await this.nodeSnapShotter.updateOrCreateSnapShots(nodes, crawl);
        console.timeEnd("node");

        /*
        Step 2: Create Measurements
         */
        let publicKeyToNodeMap = new Map<PublicKey, Node>(
            nodes.map(node => [node.publicKey!, node])
        );

        try{
            console.time("nodeMeasurements");
            await this.createNodeMeasurements(nodes, activeSnapShots, crawl, publicKeyToNodeMap);
            console.timeEnd("nodeMeasurements");
        }catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        try{
            console.time("orgMeasurements");
            await this.createOrganizationMeasurements(organizations, activeOrganizationSnapShots, crawl, publicKeyToNodeMap);
            console.timeEnd("orgMeasurements");
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        //crawl should halt if network measurements fail.
        console.time("networkMeasurements");
        await this.createNetworkMeasurements(nodes, organizations, crawl);
        console.timeEnd("networkMeasurements");

        crawl.completed = true;

        await this.crawlRepository.save(crawl);

        /*
        Step 3: rollup measurements
         */
        try{
            console.time("rollup");
            await this.measurementRollupService.rollupMeasurements(crawl);
            console.timeEnd("rollup");
        }catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        /*
        Step 4: Archiving
        */

        try{
            await this.archiver.archiveNodes(crawl);//todo move up?
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }

        /*try{
            await this.archiver.archiveOrganizations(crawl, activeOrganizationSnapShots, activeSnapShots);
        } catch (e) {
            console.log(e); //todo winston
            Sentry.captureException(e);
        }
        */
        /*
        Optional Step 5: store latest x days in cache table
        Another option is to compute live when data is requested.
         */

        return crawl;
    }

    //@ts-ignore
    private async createNetworkMeasurements(nodes: Node[], organizations: Organization[], crawl: CrawlV2) {
        let network = new Network(nodes, organizations); //todo: inject?
        let networkMeasurement = new NetworkMeasurement(crawl.time);

        let analysisResult:AnalysisResult;

        try{
            analysisResult = this.fbasAnalyzer.performAnalysis(network);
            console.log("[MAIN]: cache_hit network analysis: " + analysisResult.cache_hit);
        } catch (e) {
            throw new FbasError(e.message);
        }

        networkMeasurement.hasQuorumIntersection = analysisResult.has_quorum_intersection;
        networkMeasurement.minBlockingSetSize = analysisResult.minimal_blocking_sets.length > 0 ? analysisResult.minimal_blocking_sets[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetFilteredSize = analysisResult.minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetOrgsSize = analysisResult.org_minimal_blocking_sets.length > 0 ? analysisResult.org_minimal_blocking_sets[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetCountrySize = analysisResult.country_minimal_blocking_sets.length > 0 ? analysisResult.country_minimal_blocking_sets[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetISPSize = analysisResult.isp_minimal_blocking_sets.length > 0 ? analysisResult.country_minimal_blocking_sets[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetOrgsFilteredSize = analysisResult.org_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.org_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetCountryFilteredSize = analysisResult.country_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.country_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
        networkMeasurement.minBlockingSetISPFilteredSize = analysisResult.isp_minimal_blocking_sets_faulty_nodes_filtered.length > 0 ? analysisResult.isp_minimal_blocking_sets_faulty_nodes_filtered[0].length : 0; //results ordered by size
        networkMeasurement.minSplittingSetSize = analysisResult.minimal_splitting_sets.length > 0 ? analysisResult.minimal_splitting_sets[0].length : 0; //results ordered by size
        networkMeasurement.minSplittingSetOrgsSize = analysisResult.org_minimal_splitting_sets.length > 0 ? analysisResult.org_minimal_splitting_sets[0].length : 0; //results ordered by size
        networkMeasurement.topTierSize = analysisResult.top_tier.length;
        networkMeasurement.topTierOrgsSize = analysisResult.org_top_tier.length;
        networkMeasurement.nrOfActiveWatchers = network.networkStatistics.nrOfActiveWatchers;
        networkMeasurement.nrOfActiveValidators = network.networkStatistics.nrOfActiveValidators;
        networkMeasurement.nrOfActiveFullValidators = network.networkStatistics.nrOfActiveFullValidators;
        networkMeasurement.nrOfActiveOrganizations = network.networkStatistics.nrOfActiveOrganizations;
        networkMeasurement.transitiveQuorumSetSize = network.networkStatistics.transitiveQuorumSetSize;
        networkMeasurement.hasTransitiveQuorumSet = network.networkStatistics.hasTransitiveQuorumSet;

        await this.connection.manager.insert(NetworkMeasurement, networkMeasurement);
    }

    private async createOrganizationMeasurements(organizations: Organization[], allSnapShots: OrganizationSnapShot[], crawl: CrawlV2, publicKeyToNodeMap: Map<PublicKey, Node>) {

        if(allSnapShots.length <= 0) {
            return;
        }

        let organizationIdToOrganizationMap = new Map<string, Organization>(
            organizations.map(organization => [organization.id, organization])
        );

        let organizationMeasurements: OrganizationMeasurement[] = [];
        allSnapShots.forEach(snapShot => {
            let organization = organizationIdToOrganizationMap.get(snapShot.organizationIdStorage.organizationId);

            if (organization) {
                let organizationMeasurement = new OrganizationMeasurement(crawl.time, snapShot.organizationIdStorage);
                organizationMeasurement.isSubQuorumAvailable =
                    this.getOrganizationFailAt(organization, publicKeyToNodeMap) >= 1;
                organizationMeasurement.index = 0;//future proof
                organizationMeasurements.push(organizationMeasurement);
            }
        });

        await this.connection.manager.insert(OrganizationMeasurement, organizationMeasurements);
    }

    private getOrganizationFailAt(organization: Organization, publicKeyToNodeMap: Map<PublicKey, Node>) {
        let nrOfValidatingNodes = organization.validators
            .map(validator => publicKeyToNodeMap.get(validator))
            .filter(validator => validator !== undefined)
            .filter(validator => validator!.isValidating).length;
        return nrOfValidatingNodes - organization.subQuorumThreshold + 1;
    }

    private async createNodeMeasurements(nodes: Node[], allSnapShots: NodeSnapShot[], newCrawl: CrawlV2, publicKeyToNodeMap: Map<PublicKey, Node>) {
        if(allSnapShots.length <= 0) {
            return;
        }
        let publicKeys:Set<string> = new Set();

        let nodeMeasurements: NodeMeasurementV2[] = [];
        allSnapShots.forEach(snapShot => {
            let node = publicKeyToNodeMap.get(snapShot.nodePublicKey.publicKey);

            if(!node){               //entity was not returned from crawler, so we mark it as inactive
                                     //todo: index will be zero, need a better solution here.
                node = snapShot.toNode(newCrawl.time);
            }

            if(!publicKeys.has(snapShot.nodePublicKey.publicKey)){
                publicKeys.add(snapShot.nodePublicKey.publicKey)
                let nodeMeasurement = NodeMeasurementV2.fromNode(newCrawl.time, snapShot.nodePublicKey, node);
                nodeMeasurements.push(nodeMeasurement);
            } else {
                console.log("[CrawlProcessor] Error: node has multiple active snapshots: " + snapShot.nodePublicKey.publicKey);
            }

        });

        await this.connection.manager.insert(NodeMeasurementV2, nodeMeasurements);
    }
}