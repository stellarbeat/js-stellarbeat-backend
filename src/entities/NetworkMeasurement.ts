import {Entity, Column, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";

@Entity()
export default class NetworkMeasurement {

    @ManyToOne(type => CrawlV2, {primary: true})
    crawl: CrawlV2;

    @Column("smallint")
    nrOfActiveNodes: number = 0;

    @Column("smallint")
    nrOfValidators: number = 0; //validators that are validating

    @Column("smallint")
    nrOfFullValidators: number = 0;

    @Column("smallint")
    nrOfOrganizations: number = 0;

    @Column("smallint")
    transitiveQuorumSetSize: number = 0;

    @Column("bool") //future proof
    hasQuorumIntersection: boolean = false;

    constructor(crawl: CrawlV2) {
        this.crawl = crawl;
    }
}