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

    @Column("smallint")
    topTierSize: number = 0;

    //should equal transitive quorum set size
    //filters out non validating nodes
    @Column("smallint")
    topTierFilteredSize: number = 0;

    @Column("smallint")
    topTierOrgsSize: number = 0;

    //filters out non validating organizations
    @Column("smallint")
    topTierOrgsFilteredSize: number = 0;

    @Column("bool")
    hasQuorumIntersection: boolean = false;

    //filters out non validating nodes
    @Column("bool")
    hasQuorumIntersectionFiltered: boolean = false;

    @Column("smallint")
    minBlockingSetSize: number = 0;

    @Column("smallint")
    minBlockingSetOrgsSize: number = 0;

    @Column("smallint")
    minBlockingSetFilteredSize: number = 0;

    @Column("smallint")
    minBlockingSetOrgsFilteredSize: number = 0;

    @Column("smallint")
    minSplittingSetSize: number = 0;

    @Column("smallint")
    minSplittingSetOrgsSize: number = 0;

    @Column("smallint")
    minSplittingSetFilteredSize: number = 0;

    @Column("smallint")
    minSplittingSetOrgsFilteredSize: number = 0;

    constructor(crawl: CrawlV2) {
        this.crawl = crawl;
    }
}