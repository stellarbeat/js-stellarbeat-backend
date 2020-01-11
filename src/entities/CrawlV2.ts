import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
@Index(["validFrom", "validTo"])
@Index(["validFrom", "completed"])//todo migration
export default class CrawlV2 {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("timestamptz")
    validFrom: Date = new Date();

    @Column("timestamptz")
    validTo: Date = CrawlV2.MAX_DATE;

    @Column("simple-array", {default: ''})
    ledgers:number[];

    @Column("boolean", {default: false})
    completed:boolean = false;

    static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

    constructor(validFrom:Date = new Date(), ledgers:number[] = []) {
        this.validFrom = validFrom;
        this.ledgers = ledgers;
    }

    toString(){
        return `Crawl (id: ${this.id})`
    }
}