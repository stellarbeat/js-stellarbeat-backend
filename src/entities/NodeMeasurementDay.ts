import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export default class NodeMeasurementDay {

    @PrimaryColumn("timestamptz")
    day: Date;

    @PrimaryColumn("varchar", { length: 56 })
    publicKey: String;

    @Column("smallint", {default: 0})
    isValidatingCount: number = 0;

    @Column("smallint", {default: 0})
    crawlCount:number = 0;

    constructor(publicKey:string, day = new Date()) {
        this.publicKey = publicKey;
        this.day = day;
    }
}