import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index} from "typeorm";
import {Organization} from "@stellarbeat/js-stellar-domain";

import Crawl from "./Crawl";

@Entity("organization")
export default class OrganizationStorage {

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    // @ts-ignore
    @ManyToOne(type => Crawl, crawl => crawl.node)
    @Index()
    crawl: Crawl;

    @Column("jsonb")
    organizationJson:Organization;

    constructor(crawl: Crawl, organization:Organization) {
        this.organizationJson = organization;
        this.crawl = crawl;
    }
}