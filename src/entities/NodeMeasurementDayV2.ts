import {Entity, Column, PrimaryColumn} from "typeorm";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

@Entity()
export default class NodeMeasurementDayV2 {

    @PrimaryColumn("timestamptz")
    day: Date;

    @PrimaryColumn("integer")
    @Column("varchar", { length: 56 })
    publicKey: String;

    @Column("smallint", {default: 0})
    isActiveCount: number = 0;

    @Column("smallint", {default: 0})
    isValidatingCount: number = 0;

    @Column("smallint", {default: 0})
    isFullValidatorCount: number = 0;

    @Column("smallint", {default: 0})
    isOverloadedCount: number = 0;

    @Column("smallint")
    indexAverage: number = 0; //future proof
    
    @Column("smallint", {default: 0})
    crawlCount:number = 0;

    constructor(publicKey:PublicKey, day = new Date()) {
        this.publicKey = publicKey;
        this.day = day;
    }
}