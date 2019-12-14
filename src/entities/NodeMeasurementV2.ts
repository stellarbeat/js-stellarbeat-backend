import {Entity, Column, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";
import NodeStorageV2 from "./NodeStorageV2";

@Entity()
export default class NodeMeasurementV2 {

    @ManyToOne(type => CrawlV2, {primary: true})
    crawl: CrawlV2;

    @ManyToOne(type => NodeStorageV2, {primary: true, nullable: false, eager: true})
    nodeStorage: NodeStorageV2;

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

    constructor(crawl: CrawlV2, nodeStorage:NodeStorageV2) {
        this.crawl = crawl;
        this.nodeStorage = nodeStorage;
    }
}