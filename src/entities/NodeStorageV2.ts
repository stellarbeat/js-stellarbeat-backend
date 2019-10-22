import {Entity, Column, ManyToOne, PrimaryGeneratedColumn} from "typeorm";

import QuorumSetStorage from "./QuorumSetStorage";
import PublicKeyStorage from "./PublicKeyStorage";
import CrawlV2 from "./CrawlV2";
import GeoDataStorage from "./GeoDataStorage";
import OrganizationStorageV2 from "./OrganizationStorageV2";
import NodeDetailsStorage from "./NodeDetailsStorage";

@Entity("nodeV2")
export default class NodeStorageV2 {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @ManyToOne(type => PublicKeyStorage)
    publicKey: PublicKeyStorage;

    @Column("inet" )
    ip: string;

    @Column("integer")
    port: number;

    @ManyToOne(type => NodeDetailsStorage, {nullable: true})
    nodeDetails?: NodeDetailsStorage;

    // @ts-ignore
    @ManyToOne(type => QuorumSetStorage, {nullable: true})
    quorumSet?: QuorumSetStorage;

    @ManyToOne(type => GeoDataStorage, {nullable: true})
    geoData?: GeoDataStorage;

    @ManyToOne(type => OrganizationStorageV2, {nullable: true})
    organization?: OrganizationStorageV2;

    // The first crawl where this node is present
    // @ts-ignore
    @ManyToOne(type => CrawlV2, {nullable: false})
    crawlStart: CrawlV2;

    // The last crawl of the current node version. Null if this is the latest version
    @ManyToOne(type => CrawlV2, {nullable: true})
    crawlEnd?: CrawlV2;

    constructor(publicKey: PublicKeyStorage, ip:string, port: number, crawlStart: CrawlV2) {
        this.publicKey = publicKey;
        this.ip = ip;
        this.port = port;
        this.crawlStart = crawlStart;
    }
}