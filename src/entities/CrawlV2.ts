import {Entity, Column, PrimaryGeneratedColumn, Index, ValueTransformer} from "typeorm";

export const bigIntTransformer: ValueTransformer = {
    to: (entityValue: bigint) => entityValue,
    from: (databaseValue: string): bigint=> BigInt(databaseValue)
}

@Entity()
@Index(["time", "completed"])
export default class CrawlV2 {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("timestamptz")
    time: Date = new Date();

    @Column("simple-array", {default: ''})
    ledgers:number[];

    @Column("bigint", {default: 0, transformer: bigIntTransformer, nullable: false})
    latestLedger: bigint = BigInt(0);

    @Column("boolean", {default: false})
    completed:boolean = false;

    constructor(time:Date = new Date(), ledgers:number[] = []) {
        this.time = time;
        this.ledgers = ledgers;
    }

    toString(){
        return `Crawl (id: ${this.id}, time: ${this.time})`
    }
}