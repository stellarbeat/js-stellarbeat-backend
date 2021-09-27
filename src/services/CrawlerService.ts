import {err, ok, Result} from "neverthrow";
import {Crawler, CrawlerFactory, PeerNode} from "@stellarbeat/js-stellar-node-crawler";
import {Network, Node, Organization, QuorumSet} from "@stellarbeat/js-stellar-domain";
import {Ledger, NodeAddress} from "@stellarbeat/js-stellar-node-crawler/lib/crawler";
import {injectable} from "inversify";
import CrawlV2Service from "./CrawlV2Service";

export type CrawlResult = {
    nodes: Node[],
    nodesWithNewIP: Node[],
    organizations: Organization[],
    latestClosedLedger: Ledger,
    processedLedgers: number[]
}

/**
 * Uses the crawler package to perform a new crawl based on seed data in our database
 */
@injectable()
export class CrawlerService {
    public usePublicNetwork: boolean = true;
    protected crawlService: CrawlV2Service;
    protected crawler: Crawler;

    constructor(crawlService: CrawlV2Service) {
        this.crawlService = crawlService;
        this.crawler = CrawlerFactory.createCrawler(
            {
                usePublicNetwork: this.usePublicNetwork,
                maxOpenConnections: 25
            });
    }

    async crawl(fallbackTopTierNodeKeys: string[]): Promise<Result<CrawlResult, Error>> {
        if(fallbackTopTierNodeKeys.length === 0){
           return err(new Error("No fallback top tier nodes defined in .env configuration"));
        }

        let latestCrawlResult = await this.crawlService.getCrawlAt(new Date());
        if (latestCrawlResult.isErr()) {
            return err(latestCrawlResult.error);
        }
        let latestCrawl = latestCrawlResult.value;
        let latestClosedLedger: Ledger = {
            sequence: latestCrawl.latestLedger,
            closeTime: latestCrawl.time,
        }
        console.log("[MAIN] latest detected ledger of previous crawl: " + latestCrawl.latestLedger.toString());

        let network = new Network(latestCrawl.nodes, latestCrawl.organizations);

        if (network.nodes.length === 0) {
            return err(new Error("Cannot crawl network without nodes"));
        }

        let addresses: NodeAddress[] = [];
        let quorumSets: Map<string, QuorumSet> = new Map();
        network.nodes.map((node) => {
            addresses.push([node.ip, node.port]);
            if (node.quorumSet.hashKey)
                quorumSets.set(node.quorumSet.hashKey, node.quorumSet);
        })

        let topTierNodes = this.getTopTierNodes(network);
        if(topTierNodes.length === 0)
            topTierNodes = this.getFallbackTopTierNodes([], network);

        let crawlResult = await this.crawler.crawl(
            addresses,
            this.topTierNodesToQuorumSet(topTierNodes),
            latestClosedLedger,
            quorumSets
        );

        const {nodes, nodesWithNewIP} = this.mapPeerNodesToNodes(crawlResult.peers, network);

        let processedLedgers = crawlResult.closedLedgers.map(sequence => Number(sequence));
        latestClosedLedger = crawlResult.latestClosedLedger;

        return ok({
            nodes: nodes,
            organizations: network.organizations,
            nodesWithNewIP: nodesWithNewIP,
            latestClosedLedger: latestClosedLedger,
            processedLedgers: processedLedgers
        });
    }

    public mapPeerNodesToNodes(peerNodes: Map<string, PeerNode>, network: Network): { nodes: Node[], nodesWithNewIP: Node[] } {
        let nodesWithNewIp: Node[] = [];
        let nodes: Node[] = [];
        let publicKeys: Set<string> = new Set();
        peerNodes.forEach((peer) => {
            publicKeys.add(peer.publicKey);
            if (!peer.ip || !peer.port)
                return;//the crawler picked up scp messages for node but never could connect. We ignore these nodes.
            let node = network.getNodeByPublicKey(peer.publicKey);
            if (!node)
                node = new Node(peer.publicKey);

            if (node.ip !== peer.ip)
                nodesWithNewIp.push(node);

            node.ip = peer.ip;
            node.port = peer.port;

            if (peer.quorumSet)//to make sure we dont override qsets just because the node was not validating this round.
                node.quorumSet = peer.quorumSet;

            node.isValidating = peer.isValidating;
            node.overLoaded = peer.overLoaded;
            node.active = peer.successfullyConnected;
            //todo: participating in scp
            if (peer.nodeInfo) {
                node.ledgerVersion = peer.nodeInfo.ledgerVersion;
                node.overlayMinVersion = peer.nodeInfo.overlayMinVersion;
                node.overlayVersion = peer.nodeInfo.overlayVersion;
                node.versionStr = peer.nodeInfo.versionString;
                node.networkId = peer.nodeInfo.networkId;
            }

            nodes.push(node);
        });

        network.nodes.filter(node => !publicKeys.has(node.publicKey)).forEach((node) => {
            node.overLoaded = false;
            node.active = false;
            node.isValidating = false;
            nodes.push(node);
        })

        return {
            nodes: nodes,
            nodesWithNewIP: nodesWithNewIp
        };
    }

    //todo: move to network
    getTopTierNodes(network: Network) {
        return network.nodes.filter((node) => network.nodesTrustGraph.isVertexPartOfNetworkTransitiveQuorumSet(node.publicKey));
    }

    getFallbackTopTierNodes(fallbackTopTierNodesPublicKeys: string[], network: Network){
        return fallbackTopTierNodesPublicKeys.map((publicKey) => network.getNodeByPublicKey(publicKey));
    }

    topTierNodesToQuorumSet(topTierNodes: Node[]) {
        let organizations: Map<string, Node[]> = new Map<string, Node[]>();
        let validatorsWithoutOrganizations: Node[] = [];
        topTierNodes.forEach((node) => {
            if (!node.organizationId)
                validatorsWithoutOrganizations.push(node);
            else {
                let orgNodes = organizations.get(node.organizationId);
                if (!orgNodes)
                    orgNodes = [];
                orgNodes.push(node);
                organizations.set(node.organizationId, orgNodes);
            }
        })

        let quorumSet = new QuorumSet();
        quorumSet.validators = validatorsWithoutOrganizations.map((node) => {
            return node.publicKey
        })

        organizations.forEach((nodes, orgId) => {
            let innerQSet = new QuorumSet();
            innerQSet.validators = nodes.map(node => node.publicKey);
            innerQSet.threshold = Math.floor(innerQSet.validators.length / 2) + 1;
            quorumSet.innerQuorumSets.push(innerQSet);
        })

        quorumSet.threshold = Math.floor((quorumSet.validators.length + quorumSet.innerQuorumSets.length) / 2) + 1;

        return quorumSet;
    }
}