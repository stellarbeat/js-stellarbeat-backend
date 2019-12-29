import {Entity, Column} from "typeorm";

@Entity()
export default class NetworkMeasurementDay {

    @Column("timestamptz", {primary: true})
    day: Date;

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

    constructor(day = new Date()) {
        this.day = day;
    }
}