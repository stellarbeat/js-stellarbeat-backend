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

    @Column("smallint", {default: 0})
    topTierOrgsSize: number = 0;

    @Column("bool", {default: false})
    hasQuorumIntersection: boolean = false;

    //smallest blocking set size
    @Column("smallint", {default: 0})
    minBlockingSetSize: number = 0;

   //smallest blocking set size without failing nodes
    @Column("smallint", {default: 0})
    minBlockingSetFilteredSize: number = 0;

    //smallest blocking set size grouped by organizations
    @Column("smallint", {default: 0})
    minBlockingSetOrgsSize: number = 0;

    //smallest blocking set size without failing nodes grouped by organizations
    @Column("smallint", {default: 0})
    minBlockingSetOrgsFilteredSize: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetCountrySize: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetCountryFilteredSize: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetISPSize: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetISPFilteredSize: number = 0;

    //smallest splitting set size
    @Column("smallint", {default: 0})
    minSplittingSetSize: number = 0;

    //smallest splitting set size grouped by organizations
    @Column("smallint", {default: 0})
    minSplittingSetOrgsSize: number = 0;

    constructor(time: Date) {
        this.time = time;
    }
}