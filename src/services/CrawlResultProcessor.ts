import {Network, Node, Organization, PublicKey} from "@stellarbeat/js-stellar-domain";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import {Connection} from "typeorm";
import NodeMeasurementV2 from "../entities/NodeMeasurementV2";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import OrganizationMeasurement from "../entities/OrganizationMeasurement";
import NetworkMeasurement from "../entities/NetworkMeasurement";
import MeasurementsRollupService from "./MeasurementsRollupService";
import NodeSnapShotArchiver from "./NodeSnapShotArchiver";
import * as Sentry from "@sentry/node";
import {injectable} from "inversify";
import FbasAnalyzerService from "./FbasAnalyzerService";
import SnapShotter from "./SnapShotting/SnapShotter";
import {Result, err, ok} from "neverthrow";

export interface ICrawlResultProcessor {
    processCrawl(crawl: CrawlV2, nodes: Node[], organizations: Organization[], ledgers: number[]): Promise<Result<CrawlV2, Error>>;
}

@injectable()
export class CrawlResultProcessor implements ICrawlResultProcessor {
    protected crawlRepository: CrawlV2Repository;
    protected snapShotter: SnapShotter;
    protected connection: Connection; //todo repositories & transaction
    protected measurementRollupService: MeasurementsRollupService;
    protected archiver: NodeSnapShotArchiver;
    protected fbasAnalyzer: FbasAnalyzerService;

    constructor(
        crawlRepository: CrawlV2Repository,
        snapShotter: SnapShotter,
        measurementRollupService: MeasurementsRollupService,
        archiver: NodeSnapShotArchiver,
        connection: Connection,
        fbasAnalyzer: FbasAnalyzerService
    ) {
        this.crawlRepository = crawlRepository;
        this.connection = connection;
        this.measurementRollupService = measurementRollupService;
        this.archiver = archiver;
        this.fbasAnalyzer = fbasAnalyzer;
        this.snapShotter = snapShotter;
    }

    async processCrawl(crawl: CrawlV2, nodes: Node[], organizations: Organization[]): Promise<Result<CrawlV2, Error>> {

        try {
            await this.crawlRepository.save(crawl);

            let snapShots = await this.snapShotter.updateOrCreateSnapShots(nodes, organizations, crawl.time);
            let publicKeyToNodeMap = new Map<PublicKey, Node>(
                nodes.map(node => [node.publicKey!, node])
            );

            console.time("nodeMeasurements");
            await this.createNodeMeasurements(nodes, snapShots.nodeSnapShots, crawl, publicKeyToNodeMap);
            console.timeEnd("nodeMeasurements");

            console.time("orgMeasurements");
            await this.createOrganizationMeasurements(organizations, snapShots.organizationSnapShots, crawl, publicKeyToNodeMap);
            console.timeEnd("orgMeasurements");

            console.time("networkMeasurements");
            let result = await this.createNetworkMeasurements(nodes, organizations, crawl);
            if (result.isOk()) {
                crawl.completed = true;
            } else {
                crawl.completed = false;
            }
            console.timeEnd("networkMeasurements");

            await this.crawlRepository.save(crawl);

            /*
            Step 3: rollup measurements
             */
            console.time("rollup");
            await this.measurementRollupService.rollupMeasurements(crawl);
            console.timeEnd("rollup");

            /*
            Step 4: Archiving
            */
            await this.archiver.archiveNodes(crawl);//todo move up?

            return ok(crawl);
        } catch (e) {
            let error: Error;
            if (!(e instanceof Error))
                error = new Error("Error processing crawl");
            else error = e;

            Sentry.captureException(e);
            console.log(error.message);
            return err(error);
        }
    }

    private async createNetworkMeasurements(nodes: Node[], organizations: Organization[], crawl: CrawlV2): Promise<Result<undefined, Error>> {
        let network = new Network(nodes, organizations); //todo: inject?
        let networkMeasurement = new NetworkMeasurement(crawl.time);

        const analysisResult = await this.fbasAnalyzer.performAnalysis(network);
        console.log(analysisResult)
        if (analysisResult.isErr())
            return err(analysisResult.error);

        const analysis = analysisResult.value;
        console.log("[MAIN]: cache_hit network analysis: " + analysis.cacheHit);

        networkMeasurement.hasQuorumIntersection = analysis.hasQuorumIntersection;
        networkMeasurement.hasSymmetricTopTier = analysis.hasSymmetricTopTier;

        networkMeasurement.minBlockingSetSize = analysis.minimalBlockingSetsMinSize;
        networkMeasurement.minBlockingSetFilteredSize = analysis.minimalBlockingSetsFaultyNodesFilteredMinSize;
        networkMeasurement.minBlockingSetOrgsSize = analysis.orgMinimalBlockingSetsMinSize;
        networkMeasurement.minBlockingSetCountrySize = analysis.countryMinimalBlockingSetsMinSize;
        networkMeasurement.minBlockingSetISPSize = analysis.ispMinimalBlockingSetsMinSize;
        networkMeasurement.minBlockingSetOrgsFilteredSize = analysis.orgMinimalBlockingSetsFaultyNodesFilteredMinSize;
        networkMeasurement.minBlockingSetCountryFilteredSize = analysis.countryMinimalBlockingSetsFaultyNodesFilteredMinSize;
        networkMeasurement.minBlockingSetISPFilteredSize = analysis.ispMinimalBlockingSetsFaultyNodesFilteredMinSize;
        networkMeasurement.minSplittingSetSize = analysis.minimalSplittingSetsMinSize;
        networkMeasurement.minSplittingSetOrgsSize = analysis.orgMinimalSplittingSetsMinSize;
        networkMeasurement.minSplittingSetCountrySize = analysis.countryMinimalSplittingSetsMinSize;
        networkMeasurement.minSplittingSetISPSize = analysis.ispMinimalSplittingSetsMinSize;
        networkMeasurement.topTierSize = analysis.topTierSize;
        networkMeasurement.topTierOrgsSize = analysis.orgTopTierSize;
        networkMeasurement.nrOfActiveWatchers = network.networkStatistics.nrOfActiveWatchers;
        networkMeasurement.nrOfActiveValidators = network.networkStatistics.nrOfActiveValidators;
        networkMeasurement.nrOfActiveFullValidators = network.networkStatistics.nrOfActiveFullValidators;
        networkMeasurement.nrOfActiveOrganizations = network.networkStatistics.nrOfActiveOrganizations;
        networkMeasurement.transitiveQuorumSetSize = network.networkStatistics.transitiveQuorumSetSize;
        networkMeasurement.hasTransitiveQuorumSet = network.networkStatistics.hasTransitiveQuorumSet;

        try {
            await this.connection.manager.insert(NetworkMeasurement, networkMeasurement);
        } catch (e) {
            if (e instanceof Error)
                return err(e);

            return err(new Error("Error inserting network measurement in db"));
        }

        return ok(undefined);
    }

    private async createOrganizationMeasurements(organizations: Organization[], allSnapShots: OrganizationSnapShot[], crawl: CrawlV2, publicKeyToNodeMap: Map<PublicKey, Node>) {

        if (allSnapShots.length <= 0) {
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

        if (organizationMeasurements.length <= 0)
            return;

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
        if (allSnapShots.length <= 0) {
            return;
        }
        let publicKeys: Set<string> = new Set();

        let nodeMeasurements: NodeMeasurementV2[] = [];
        allSnapShots.forEach(snapShot => {
            let node = publicKeyToNodeMap.get(snapShot.nodePublicKey.publicKey);

            if (!node) {               //entity was not returned from crawler, so we mark it as inactive
                //todo: index will be zero, need a better solution here.
                node = snapShot.toNode(newCrawl.time);
            }

            if (!publicKeys.has(snapShot.nodePublicKey.publicKey)) {
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