import {err, ok, Result} from "neverthrow";
import {Crawler, CrawlerFactory} from "@stellarbeat/js-stellar-node-crawler";
import {Network, Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import {CrawlResult, Ledger, NodeAddress} from "@stellarbeat/js-stellar-node-crawler/lib/crawler";
import {injectable} from "inversify";

@injectable()
export class CrawlerService {
    public usePublicNetwork: boolean = true;
    protected crawler: Crawler;

    constructor() {
        this.crawler = CrawlerFactory.createCrawler(//todo dependency inversion
            {
                usePublicNetwork: this.usePublicNetwork,
                maxOpenConnections: 25
            })
    }

    async crawl(network: Network, latestClosedLedger: Ledger): Promise<Result<CrawlResult, Error>> {
        //todo: latestClosedLedger part of network domain class?
        try {
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

            let crawlResult = await this.crawler.crawl(
                addresses,
                this.topTierNodesToQuorumSet(this.getTopTierNodes(network)),
                latestClosedLedger,
                quorumSets
            );

            return ok(crawlResult);
        } catch (e) {
            if (e instanceof Error)
                return err(e);
            return err(new Error("Error during crawl"));
        }
    }

    //todo: move to network
    getTopTierNodes(network: Network) {
        return network.nodes.filter((node) => network.nodesTrustGraph.isVertexPartOfNetworkTransitiveQuorumSet(node.publicKey));
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