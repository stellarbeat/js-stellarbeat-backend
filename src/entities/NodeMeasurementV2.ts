import {Entity, Column, PrimaryColumn, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

@Entity()
export default class NodeMeasurementV2 {

    @ManyToOne(type => CrawlV2)
    @PrimaryColumn("integer")
    crawl: CrawlV2;

    @PrimaryColumn("varchar", { length: 56 })
    publicKey: String;

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

    constructor(crawl: CrawlV2, publicKey:PublicKey) {
        this.crawl = crawl;
        this.publicKey = publicKey;
    }
}