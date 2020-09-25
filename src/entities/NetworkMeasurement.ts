import {Entity, Column} from "typeorm";

/**
 * See https://arxiv.org/pdf/2002.08101.pdf for more explanation of top tier, splitting & blocking sets
 */
@Entity()
export default class NetworkMeasurement {

    @Column("timestamptz", {primary: true})
    time: Date;

    @Column("smallint", {default: 0})
    nrOfActiveWatchers: number = 0;

    @Column("smallint", {default: 0})
    nrOfActiveValidators: number = 0; //validators that are validating

    @Column("smallint", {default: 0})
    nrOfActiveFullValidators: number = 0;

    @Column("smallint", {default: 0})
    nrOfActiveOrganizations: number = 0;

    @Column("smallint", {default: 0})
    transitiveQuorumSetSize: number = 0;

    @Column("bool", {default: false})
    hasTransitiveQuorumSet: boolean = false;

    @Column("smallint", {default: 0})
    topTierSize: number = 0;

    //should equal transitive quorum set size
    //filters out non validating nodes
    @Column("smallint", {default: 0})
    topTierFilteredSize: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsSize: number = 0;

    //filters out non validating organizations
    @Column("smallint", {default: 0})
    topTierOrgsFilteredSize: number = 0;

    @Column("bool", {default: false})
    hasQuorumIntersection: boolean = false;

    //filters out non validating nodes
    @Column("bool", {default: false})
    hasQuorumIntersectionFiltered: boolean = false;

    //smallest blocking set size
    @Column("smallint", {default: 0})
    minBlockingSetSize: number = 0;

    //smallest blocking set size grouped by organizations
    @Column("smallint", {default: 0})
    minBlockingSetOrgsSize: number = 0;

    //smallest blocking set size without failing nodes
    @Column("smallint", {default: 0})
    minBlockingSetFilteredSize: number = 0;

    //smallest blocking set size without failing nodes grouped by organizations
    @Column("smallint", {default: 0})
    minBlockingSetOrgsFilteredSize: number = 0;

    //smallest splitting set size
    @Column("smallint", {default: 0})
    minSplittingSetSize: number = 0;

    //smallest splitting set size grouped by organizations
    @Column("smallint", {default: 0})
    minSplittingSetOrgsSize: number = 0;

    //smallest splitting set size without failed nodes
    @Column("smallint", {default: 0})
    minSplittingSetFilteredSize: number = 0;

    //smallest splitting set size without failed nodes grouped by organizations
    @Column("smallint", {default: 0})
    minSplittingSetOrgsFilteredSize: number = 0;

    constructor(time: Date) {
        this.time = time;
    }
}