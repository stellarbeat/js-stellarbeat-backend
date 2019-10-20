import {Entity, Column, ManyToOne, PrimaryColumn} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";
import CrawlV2 from "./CrawlV2";

@Entity()
export default class OrganizationMeasurement {

    @ManyToOne(type => CrawlV2)
    @PrimaryColumn("integer")
    crawl: CrawlV2;

    @ManyToOne(type => OrganizationIdStorage)
    @PrimaryColumn("integer")
    organizationId: OrganizationIdStorage;

    @Column("bool")
    isSubQuorumAvailable: Boolean = false;

    @Column("smallint")
    index: number = 0; //future proof

    constructor(crawl: CrawlV2, organizationId:OrganizationIdStorage) {
        this.crawl = crawl;
        this.organizationId = organizationId;
    }
}