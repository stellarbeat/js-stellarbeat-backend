import {Entity, Column, ManyToOne} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";

@Entity()
export default class OrganizationMeasurementDay {

    @Column("date", {primary: true, name: 'day'})
    protected _day: string;

    @ManyToOne(type => OrganizationIdStorage, {primary: true, nullable: false, eager: true})
    organizationIdStorage: OrganizationIdStorage;

    @Column("smallint", {default: 0})
    isSubQuorumAvailableCount: number = 0;

    @Column("int")
    indexSum: number = 0; //future proof

    @Column("smallint", {default: 0})
    crawlCount:number = 0;

    constructor(day: string, organizationId:OrganizationIdStorage) {
        this._day = day;
        this.organizationIdStorage = organizationId;
    }

    get day(){
        return new Date(this._day);
    }
}