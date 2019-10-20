import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
export default class Crawl {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("timestamptz")
    time: Date;

    @Column("simple-array", {default: ''})
    ledgers:number[];

    constructor(time:Date = new Date(), ledgers:number[] = []) {
        this.time = time;
        this.ledgers = ledgers;
    }
}