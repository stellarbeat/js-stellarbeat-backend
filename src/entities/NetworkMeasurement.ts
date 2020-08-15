import {Entity, Column, ManyToOne} from "typeorm";
import CrawlV2 from "./CrawlV2";

/**
 * See https://arxiv.org/pdf/2002.08101.pdf for more explanation of top tier, splitting & blocking sets
 */
@Entity()
export default class NetworkMeasurement {

    @ManyToOne(type => CrawlV2, {primary: true})
    crawl: CrawlV2;

    @Column("smallint")
    nrOfActiveWatchers: number = 0;

    @Column("smallint")
    nrOfActiveValidators: number = 0; //validators that are validating

    @Column("smallint")
    nrOfActiveFullValidators: number = 0;

    @Column("smallint")
    nrOfActiveOrganizations: number = 0;

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

    //smallest blocking set size
    @Column("smallint")
    minBlockingSetSize: number = 0;

    //smallest blocking set size grouped by organizations
    @Column("smallint")
    minBlockingSetOrgsSize: number = 0;

    //smallest blocking set size without failing nodes
    @Column("smallint")
    minBlockingSetFilteredSize: number = 0;

    //smallest blocking set size without failing nodes grouped by organizations
    @Column("smallint")
    minBlockingSetOrgsFilteredSize: number = 0;

    //smallest splitting set size
    @Column("smallint")
    minSplittingSetSize: number = 0;

    //smallest splitting set size grouped by organizations
    @Column("smallint")
    minSplittingSetOrgsSize: number = 0;

    //smallest splitting set size without failed nodes
    @Column("smallint")
    minSplittingSetFilteredSize: number = 0;

    //smallest splitting set size without failed nodes grouped by organizations
    @Column("smallint")
    minSplittingSetOrgsFilteredSize: number = 0;

    constructor(crawl: CrawlV2) {
        this.crawl = crawl;
    }
}