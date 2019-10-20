import {Entity, Column, ManyToOne, PrimaryColumn} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";

@Entity()
export default class OrganizationMeasurementDay {

    @PrimaryColumn("timestamptz")
    day: Date;

    @ManyToOne(type => OrganizationIdStorage)
    @PrimaryColumn("integer")
    organizationId: OrganizationIdStorage;

    @Column("smallint", {default: 0})
    isSubQuorumAvailableCount: number = 0;

    @Column("int")
    indexAverage: number = 0; //future proof

    @Column("smallint", {default: 0})
    crawlCount:number = 0;

    constructor(day: Date, organizationId:OrganizationIdStorage) {
        this.day = day;
        this.organizationId = organizationId;
    }
}