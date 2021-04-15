import {Crawler} from "@stellarbeat/js-stellar-node-crawler";
import {Node} from "@stellarbeat/js-stellar-domain";

export class CrawlService {
    public usePublicNetwork: boolean = true;
    protected _crawler?: Crawler;
    public horizonLedger = 0;

    async crawl(nodesSeed:Node[], horizonLedger:number): Promise<Node[]> {
        if(horizonLedger)
            this.horizonLedger =  horizonLedger;
        if (nodesSeed.length === 0) {
            throw new Error("no seed nodes in database");
        }
        let nodes = await this.crawler.crawl(nodesSeed, this.horizonLedger);
        this.horizonLedger = this.crawler.horizonLatestLedger;
        nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys

        return nodes;
    }

    get crawler(){
        if(!this._crawler)
            this._crawler = new Crawler(this.usePublicNetwork, 5000);

        return this._crawler;
    }

    getLatestProcessedLedgers() {
        return this.crawler.getProcessedLedgers();
    }
}