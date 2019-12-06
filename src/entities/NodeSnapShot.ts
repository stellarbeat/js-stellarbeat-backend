import {Entity, Column, ManyToOne, PrimaryGeneratedColumn, Index} from "typeorm";

import QuorumSetStorage from "./QuorumSetStorage";
import CrawlV2 from "./CrawlV2";
import GeoDataStorage from "./GeoDataStorage";
import OrganizationSnapShot from "./OrganizationSnapShot";
import NodeDetailsStorage from "./NodeDetailsStorage";
import NodeStorageV2 from "./NodeStorageV2";
import {Node} from "@stellarbeat/js-stellar-domain";

@Entity('node_snap_shot')
export default class NodeSnapShot {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @ManyToOne(type => NodeStorageV2)
    nodeStorage: NodeStorageV2;

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

    @ManyToOne(type => OrganizationSnapShot, {nullable: true})
    organization?: OrganizationSnapShot;

    // The first crawl where this node is present
    // @ts-ignore
    @ManyToOne(type => CrawlV2, {nullable: false})
    crawlStart: CrawlV2;

    // The last crawl of the current node version. Null if this is the latest version
    @ManyToOne(type => CrawlV2, {nullable: true})
    crawlEnd?: CrawlV2;

    constructor(nodeStorage: NodeStorageV2, ip:string, port: number, crawlStart: CrawlV2) {
        this.nodeStorage = nodeStorage;
        this.ip = ip;
        this.port = port;
        this.crawlStart = crawlStart;
    }

    quorumSetChanged(node: Node): boolean {
        if(!this.quorumSet)
            return node.isValidator;

        return this.quorumSet.hash !== node.quorumSet.hashKey;
    }

    nodeIpPortChanged(node: Node):boolean {
        return this.ip !== node.ip
            || this.port !== node.port;
    }

    nodeDetailsChanged(node: Node):boolean {
        if(!this.nodeDetails)
            return node.versionStr !== undefined || node.overlayVersion !== undefined || node.overlayMinVersion !== undefined || node.ledgerVersion !== undefined;

        return this.nodeDetails.alias !== node.alias
            || this.nodeDetails.historyUrl !== node.historyUrl
            || this.nodeDetails.homeDomain !== node.homeDomain
            || this.nodeDetails.host !== node.host
            || this.nodeDetails.isp !== node.isp
            || this.nodeDetails.ledgerVersion !== node.ledgerVersion
            || this.nodeDetails.name !== node.name
            || this.nodeDetails.overlayMinVersion !== node.overlayMinVersion
            || this.nodeDetails.overlayVersion !== node.overlayVersion
            || this.nodeDetails.versionStr !== node.versionStr;
    }

    geoDataChanged(node:Node):boolean {
        if(!this.geoData) {
            return node.geoData.latitude !== undefined || node.geoData.longitude !== undefined;
        }

        return this.geoData.latitude !== node.geoData.latitude
            || this.geoData.longitude !== node.geoData.longitude;
    }
}