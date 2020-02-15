import {CrawlRepository} from "../repositories/CrawlRepository";
import {Crawler} from "@stellarbeat/js-stellar-node-crawler";
import {Node} from "@stellarbeat/js-stellar-domain";

export class CrawlService {
    protected _crawlRepository: CrawlRepository;
    protected _crawler: Crawler;

    constructor(
        crawlRepository: CrawlRepository) {
        this._crawlRepository = crawlRepository;
        this._crawler = new Crawler(true, 5000);
    }

    async crawl(nodesSeed:Node[]): Promise<Node[]> {
        if (nodesSeed.length === 0) {
            throw new Error("no seed nodes in database");
        }
        let nodes = await this._crawler.crawl(nodesSeed);

        nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys
        nodes = this.removeDuplicatePublicKeys(nodes);

        return nodes;
    }

    getLatestProcessedLedgers() {
        return this._crawler.getProcessedLedgers();
    }

    protected removeDuplicatePublicKeys(nodes: Node[]): Node[] {
        //filter out double public keys (nodes that switched ip address, or have the same public key running on different ip's at the same time)
        //statistics are lost because new ip
        let publicKeys = nodes.map((node: Node) => node.publicKey!);
        let duplicatePublicKeys: string[] = [];
        publicKeys.forEach((element, index) => {

            // Find if there is a duplicate or not
            if (publicKeys.indexOf(element, index + 1) > -1) {

                // Is the duplicate already registered?
                if (duplicatePublicKeys.indexOf(element) === -1) {
                    duplicatePublicKeys.push(element);
                }
            }
        });

        duplicatePublicKeys.forEach(duplicatePublicKey => {
            console.log('duplicate publicKey: ' + duplicatePublicKey);
            let duplicateNodes = nodes.filter(node => node.publicKey === duplicatePublicKey);

            let nodeToKeep = duplicateNodes[0];
            console.log('with ip: ' + nodeToKeep.key);
            let originalDiscoveryDate = nodeToKeep.dateDiscovered;
            let nodesToDiscard = [];
            for (let i = 1; i < duplicateNodes.length; i++) {
                console.log('with ip: ' + duplicateNodes[i].key);
                if (duplicateNodes[i].dateDiscovered > nodeToKeep.dateDiscovered) {
                    nodesToDiscard.push(nodeToKeep);
                    nodeToKeep = duplicateNodes[i];
                } else {
                    nodesToDiscard.push(duplicateNodes[i]);
                    originalDiscoveryDate = duplicateNodes[i].dateDiscovered;
                }
            }

            let nodeWithName = duplicateNodes.find(node => node.name !== undefined && node.name !== null);
            if (nodeWithName !== undefined) {
                nodeToKeep.name = nodeWithName.name;
            }

            let nodeWithHost = duplicateNodes.find(node => node.host !== undefined && node.host !== null);
            if (nodeWithHost !== undefined) {
                nodeToKeep.host = nodeWithHost.host;
            }

            let nodeWithGeoData = duplicateNodes.find(node => node.geoData.longitude !== undefined && node.geoData.longitude !== null);
            if (nodeWithGeoData !== undefined) {
                nodeToKeep.geoData = nodeWithGeoData.geoData;
            }

            nodeToKeep.dateDiscovered = originalDiscoveryDate;

            nodesToDiscard.forEach(nodeToDiscard => {
                let index = nodes.indexOf(nodeToDiscard);
                if (index > -1) {
                    nodes.splice(index, 1);
                }
            });
        });

        return nodes;
    }
}