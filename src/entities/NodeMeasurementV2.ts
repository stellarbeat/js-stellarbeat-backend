import {Entity, Column, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";
import NodePublicKeyStorage from "./NodePublicKeyStorage";

@Entity()
export default class NodeMeasurementV2 {

    @ManyToOne(type => CrawlV2, {primary: true})
    crawl: CrawlV2;

    @ManyToOne(type => NodePublicKeyStorage, {primary: true, nullable: false, eager: true})
    nodeStorage: NodePublicKeyStorage;

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

    constructor(crawl: CrawlV2, nodeStorage:NodePublicKeyStorage) {
        this.crawl = crawl;
        this.nodeStorage = nodeStorage;
    }
}