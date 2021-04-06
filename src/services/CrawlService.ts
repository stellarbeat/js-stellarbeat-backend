import {Crawler} from "@stellarbeat/js-stellar-node-crawler";
import {Node} from "@stellarbeat/js-stellar-domain";

export class CrawlService {
    public usePublicNetwork: boolean = true;
    protected _crawler?: Crawler;

    async crawl(nodesSeed:Node[]): Promise<Node[]> {
        if (nodesSeed.length === 0) {
            throw new Error("no seed nodes in database");
        }
        let nodes = await this.crawler.crawl(nodesSeed);

        nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys

        return nodes;
    }

    get crawler(){
        if(!this._crawler)
            this._crawler = new Crawler(this.usePublicNetwork, 30000);

        return this._crawler;
    }

    getLatestProcessedLedgers() {
        return this.crawler.getProcessedLedgers();
    }
}