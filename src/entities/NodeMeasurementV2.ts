import {Entity, Column, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";
import NodePublicKeyStorage from "./NodePublicKeyStorage";
import {Node} from "@stellarbeat/js-stellar-domain";

@Entity()
export default class NodeMeasurementV2 {

    @ManyToOne(type => CrawlV2, {primary: true})
    crawl: CrawlV2;

    @ManyToOne(type => NodePublicKeyStorage, {primary: true, nullable: false, eager: true})
    nodePublicKeyStorage: NodePublicKeyStorage;

    @Column("bool")
    isActive: boolean = false;

    @Column("bool")
    isValidating: boolean = false;

    @Column("bool")
    isFullValidator: boolean = false;

    @Column("bool")
    isOverLoaded: boolean = false;

    @Column("smallint")
    index: number = 0;

    constructor(crawl: CrawlV2, nodeStorage:NodePublicKeyStorage) {
        this.crawl = crawl;
        this.nodePublicKeyStorage = nodeStorage;
    }

    static fromNode(crawl:CrawlV2, nodeStorage:NodePublicKeyStorage, node:Node){
        let nodeMeasurement = new NodeMeasurementV2(crawl, nodeStorage);
        nodeMeasurement.isValidating = node.isValidating === undefined ? false : node.isValidating;
        nodeMeasurement.isOverLoaded = node.overLoaded === undefined ? false : node.overLoaded;
        nodeMeasurement.isFullValidator = node.isFullValidator  === undefined ? false : node.isFullValidator;
        nodeMeasurement.isActive = node.active;
        nodeMeasurement.index = Math.round(node.index * 100);

        return nodeMeasurement;
    }
}