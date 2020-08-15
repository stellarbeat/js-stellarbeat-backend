import {Entity, Column} from "typeorm";

@Entity()
export default class NetworkMeasurementDay {

    @Column("date", {primary: true, name: 'day'})
    protected _day: string;

    @Column("int")
    nrOfActiveWatchersSum: number = 0;

    @Column("int")
    nrOfActiveValidatorsSum: number = 0; //validators that are validating

    @Column("int")
    nrOfActiveFullValidatorsSum: number = 0;

    @Column("int")
    nrOfActiveOrganizationsSum: number = 0;

    @Column("int")
    transitiveQuorumSetSizeSum: number = 0;

    @Column("smallint")
    hasQuorumIntersectionCount: number = 0;

    //filters out non validating nodes
    @Column("smallint")
    hasQuorumIntersectionFilteredCount: number = 0;

    @Column("smallint")
    topTierMin: number = 0;

    @Column("smallint")
    topTierMax: number = 0;

    @Column("smallint")
    topTierFilteredMin: number = 0;

    @Column("smallint")
    topTierFilteredMax: number = 0;

    @Column("smallint")
    topTierOrgsMin: number = 0;

    @Column("smallint")
    topTierOrgsMax: number = 0;

    @Column("smallint")
    topTierOrgsFilteredMin: number = 0;

    @Column("smallint")
    topTierOrgsFilteredMax: number = 0;

    @Column("smallint")
    minBlockingSetMin: number = 0;

    @Column("smallint")
    minBlockingSetMax: number = 0;

    @Column("smallint")
    minBlockingSetOrgsMin: number = 0;

    @Column("smallint")
    minBlockingSetOrgsMax: number = 0;

    @Column("smallint")
    minBlockingSetFilteredMin: number = 0;

    @Column("smallint")
    minBlockingSetFilteredMax: number = 0;

    @Column("smallint")
    minBlockingSetOrgsFilteredMin: number = 0;

    @Column("smallint")
    minBlockingSetOrgsFilteredMax: number = 0;

    @Column("smallint")
    minSplittingSetMin: number = 0;

    @Column("smallint")
    minSplittingSetMax: number = 0;

    @Column("smallint")
    minSplittingSetOrgsMin: number = 0;

    @Column("smallint")
    minSplittingSetOrgsMax: number = 0;

    @Column("smallint")
    minSplittingSetFilteredMin: number = 0;

    @Column("smallint")
    minSplittingSetFilteredMax: number = 0;

    @Column("smallint")
    minSplittingSetOrgsFilteredMin: number = 0;

    @Column("smallint")
    minSplittingSetOrgsFilteredMax: number = 0;

    @Column("smallint")
    crawlCount:number = 0;

    constructor(day: string) {
        this._day = day;
    }

    get day(){
        return new Date(this._day);
    }
}