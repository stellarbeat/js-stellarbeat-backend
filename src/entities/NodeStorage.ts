import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from "typeorm";
import {Node} from "@stellarbeat/js-stellar-domain";

import Crawl from "./Crawl";

@Entity("node")
export default class NodeStorage {

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    // @ts-ignore
    @ManyToOne(type => Crawl, crawl => crawl.node)
    crawl: Crawl;

    @Column("jsonb")
    nodeJson:Node;

    constructor(crawl: Crawl, node:Node) {
        this.nodeJson = node;
        this.crawl = crawl;
    }
}