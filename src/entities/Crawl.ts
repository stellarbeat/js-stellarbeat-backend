import {Entity, Column, PrimaryGeneratedColumn, Index, OneToMany} from "typeorm";
import NodeStorage from "./NodeStorage";

@Entity()
export default class Crawl {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("timestamptz")
    time: Date;

    // @ts-ignore
    @OneToMany(type => NodeStorage, crawl => NodeStorage.crawl)
    // @ts-ignore
    nodes: NodeStorage[];

    @Column("simple-array", {nullable: true})
    ledgers:number[];

    constructor(time:Date = new Date(), ledgers:number[] = []) {
        this.time = time;
        this.ledgers = ledgers;
    }
}