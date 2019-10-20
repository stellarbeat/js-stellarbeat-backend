import {Entity, Column, PrimaryColumn, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";
import PublicKeyStorage from "./PublicKeyStorage";

@Entity()
export default class NodeMeasurementV2 {

    @ManyToOne(type => CrawlV2)
    @PrimaryColumn("integer")
    crawl: CrawlV2;

    @ManyToOne(type => PublicKeyStorage)
    @PrimaryColumn("integer")
    publicKey: PublicKeyStorage;

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

    constructor(crawl: CrawlV2, publicKey:PublicKeyStorage) {
        this.crawl = crawl;
        this.publicKey = publicKey;
    }
}