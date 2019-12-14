import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
export default class CrawlV2 {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("timestamptz")
    validFrom: Date = new Date();

    @Index()
    @Column("timestamptz")
    validTo: Date = CrawlV2.MAX_DATE;

    @Column("simple-array", {default: ''})
    ledgers:number[];

    static readonly MAX_DATE = new Date(9999, 11, 31, 23, 59, 59);

    constructor(validFrom:Date = new Date(), ledgers:number[] = []) {
        this.validFrom = validFrom;
        this.ledgers = ledgers;
    }
}