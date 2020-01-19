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

    @Column("smallint") //future proof
    hasQuorumIntersectionCount: boolean = false;

    @Column("smallint")
    crawlCount:number = 0;

    constructor(day: string) {
        this._day = day;
    }

    get day(){
        return new Date(this._day);
    }
}