import {Entity, Column} from "typeorm";

@Entity()
export default class NetworkMeasurementDay {

    @Column("date", {primary: true, name: 'day'})
    protected _day: string;

    @Column("int")
    nrOfActiveNodesSum: number = 0;

    @Column("int")
    nrOfValidatorsSum: number = 0; //validators that are validating

    @Column("int")
    nrOfFullValidatorsSum: number = 0;

    @Column("int")
    nrOfOrganizationsSum: number = 0;

    @Column("int")
    transitiveQuorumSetSizeSum: number = 0;

    @Column("smallint")
    hasQuorumIntersectionCount: number = 0;

    //filters out non validating nodes
    @Column("smallint")
    hasQuorumIntersectionFilteredCount: number = 0;

    @Column("int")
    topTierSizeSum: number = 0;

    //filters out non validating nodes
    @Column("int")
    topTierSizeFilteredSum: number = 0;

    @Column("int")
    topTierSizeOrgsSum: number = 0;

    //filters out non validating organizations
    @Column("int")
    topTierSizeOrgsFilteredSum: number = 0;

    @Column("int")
    minBlockingSetSizeSum: number = 0;

    @Column("int")
    minBlockingSetOrgsSizeSum: number = 0;

    @Column("int")
    minBlockingSetFilteredSizeSum: number = 0;

    @Column("int")
    minBlockingSetOrgsFilteredSizeSum: number = 0;

    @Column("int")
    minSplittingSetSizeSum: number = 0;

    @Column("int")
    minSplittingSetOrgsSizeSum: number = 0;

    @Column("int")
    minSplittingSetFilteredSizeSum: number = 0;

    @Column("int")
    minSplittingSetOrgsFilteredSizeSum: number = 0;

    @Column("smallint")
    crawlCount:number = 0;

    constructor(day: string) {
        this._day = day;
    }

    get day(){
        return new Date(this._day);
    }
}