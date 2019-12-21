import {Entity, Column, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";
import NodePublicKey from "./NodePublicKey";

@Entity()
export default class NodeMeasurementV2 {

    @ManyToOne(type => CrawlV2, {primary: true})
    crawl: CrawlV2;

    @ManyToOne(type => NodePublicKey, {primary: true, nullable: false, eager: true})
    nodeStorage: NodePublicKey;

    @Column("bool")
    isActive: Boolean = false;

    @Column("bool")
    isValidating: Boolean = false;

    @Column("bool")
    isFullValidator: Boolean = false;

    @Column("bool")
    isOverLoaded: Boolean = false;

    @Column("smallint")
    index: number = 0;

    constructor(crawl: CrawlV2, nodeStorage:NodePublicKey) {
        this.crawl = crawl;
        this.nodeStorage = nodeStorage;
    }
}