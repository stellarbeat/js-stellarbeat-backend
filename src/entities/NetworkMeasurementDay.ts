import {Entity, Column} from "typeorm";

@Entity()
export default class NetworkMeasurementDay {

    @Column("date", {primary: true, name: 'time'})
    time: Date = new Date();

    @Column("int", {default: 0})
    nrOfActiveWatchersSum: number = 0;

    @Column("int", {default: 0})
    nrOfActiveValidatorsSum: number = 0; //validators that are validating

    @Column("int", {default: 0})
    nrOfActiveFullValidatorsSum: number = 0;

    @Column("int", {default: 0})
    nrOfActiveOrganizationsSum: number = 0;

    @Column("int", {default: 0})
    transitiveQuorumSetSizeSum: number = 0;

    @Column("smallint", {default: 0})
    hasQuorumIntersectionCount: number = 0;

    //filters out non validating nodes
    @Column("smallint", {default: 0})
    hasQuorumIntersectionFilteredCount: number = 0;

    @Column("smallint", {default: 0})
    topTierMin: number = 0;

    @Column("smallint", {default: 0})
    topTierMax: number = 0;

    @Column("int", {default: 0})
    topTierSum: number = 0;

    @Column("smallint", {default: 0})
    topTierFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    topTierFilteredMax: number = 0;

    @Column("int", {default: 0})
    topTierFilteredSum: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsMin: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsMax: number = 0;

    @Column("int", {default: 0})
    topTierOrgsSum: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsFilteredMax: number = 0;

    @Column("int", {default: 0})
    topTierOrgsFilteredSum: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetMax: number = 0;

    @Column("int", {default: 0})
    minBlockingSetSum: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsMax: number = 0;

    @Column("int", {default: 0})
    minBlockingSetOrgsSum: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetFilteredMax: number = 0;

    @Column("int", {default: 0})
    minBlockingSetFilteredSum: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsFilteredMax: number = 0;

    @Column("int", {default: 0})
    minBlockingSetOrgsFilteredSum: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetMax: number = 0;

    @Column("int", {default: 0})
    minSplittingSetSum: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsMax: number = 0;

    @Column("int", {default: 0})
    minSplittingSetOrgsSum: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetFilteredMax: number = 0;

    @Column("int", {default: 0})
    minSplittingSetFilteredSum: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsFilteredMax: number = 0;

    @Column("int", {default: 0})
    minSplittingSetOrgsFilteredSum: number = 0;

    @Column("smallint", {default: 0})
    crawlCount:number = 0;

}