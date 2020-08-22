import {Entity, Column} from "typeorm";

@Entity()
export default class NetworkMeasurementDay {

    @Column("date", {primary: true, name: 'day'})
    protected _day: string;

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

    @Column("smallint", {default: 0})
    topTierFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    topTierFilteredMax: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsMin: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsMax: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    topTierOrgsFilteredMax: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetMax: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsMax: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetFilteredMax: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minBlockingSetOrgsFilteredMax: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetMax: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsMax: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetFilteredMax: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsFilteredMin: number = 0;

    @Column("smallint", {default: 0})
    minSplittingSetOrgsFilteredMax: number = 0;

    @Column("smallint", {default: 0})
    crawlCount:number = 0;

    constructor(day: string) {
        this._day = day;
    }

    get day(){
        return new Date(this._day);
    }
}