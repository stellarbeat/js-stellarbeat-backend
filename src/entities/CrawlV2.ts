import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
@Index(["time", "completed"])//todo migration
export default class CrawlV2 {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("timestamptz")
    time: Date = new Date();

    @Column("simple-array", {default: ''})
    ledgers:number[];

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