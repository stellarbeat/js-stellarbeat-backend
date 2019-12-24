import {Entity, Column, ManyToOne} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";
import CrawlV2 from "./CrawlV2";

@Entity()
export default class OrganizationMeasurement {

    @ManyToOne(type => CrawlV2, {primary: true, nullable: false, eager: false})
    crawl: CrawlV2;

    @ManyToOne(type => OrganizationIdStorage, {primary: true, nullable: false, eager: true})
    organizationIdStorage: OrganizationIdStorage;

    @Column("bool")
    isSubQuorumAvailable: Boolean = false;

    @Column("smallint")
    index: number = 0; //future proof

    constructor(crawl: CrawlV2, organizationId:OrganizationIdStorage) {
        this.crawl = crawl;
        this.organizationIdStorage = organizationId;
    }
}