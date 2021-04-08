import {Crawler} from "@stellarbeat/js-stellar-node-crawler";
import {Node} from "@stellarbeat/js-stellar-domain";

export class CrawlService {
    public usePublicNetwork: boolean = true;
    protected _crawler?: Crawler;
    protected latestLedger: number = 0;
    public horizonLedger = 0;

    async crawl(nodesSeed:Node[], latestLedger:number, horizonLedger:number): Promise<Node[]> {
        if(latestLedger)
            this.latestLedger = latestLedger;
        if(horizonLedger)
            this.horizonLedger =  horizonLedger;
        if (nodesSeed.length === 0) {
            throw new Error("no seed nodes in database");
        }
        this.crawler.horizonLatestLedger = this.horizonLedger;
        let nodes = await this.crawler.crawl(nodesSeed);
        this.horizonLedger = this.crawler.horizonLatestLedger;
        nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys

        return nodes;
    }

    get crawler(){
        if(!this._crawler)
            this._crawler = new Crawler(this.usePublicNetwork, 5000, this.latestLedger);

        return this._crawler;
    }

    getLatestProcessedLedgers() {
        return this.crawler.getProcessedLedgers();
    }
}