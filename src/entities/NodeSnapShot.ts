import {Entity, Column, ManyToOne, PrimaryGeneratedColumn, Index} from "typeorm";

import QuorumSetStorage from "./QuorumSetStorage";
import GeoDataStorage from "./GeoDataStorage";
import OrganizationSnapShot from "./OrganizationSnapShot";
import NodeDetailsStorage from "./NodeDetailsStorage";
import NodeStorageV2 from "./NodeStorageV2";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "./CrawlV2";

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
@Index(["startCrawl", "endCrawl"])
export default class NodeSnapShot {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @ManyToOne(type => NodeStorageV2, {nullable: false, cascade: ['insert'], eager: true})
    nodeStorage: NodeStorageV2;

    @Column("text" )
    ip: string;

    @Column("integer")
    port: number;

    @ManyToOne(type => NodeDetailsStorage, {nullable: true, cascade: ['insert'], eager: true})
    nodeDetails: NodeDetailsStorage | null = null;

    // @ts-ignore
    @ManyToOne(type => QuorumSetStorage, {nullable: true, cascade: ['insert'], eager: true})
    quorumSet: QuorumSetStorage | null = null;

    @ManyToOne(type => GeoDataStorage, {nullable: true, cascade: ['insert'], eager: true})
    geoData: GeoDataStorage | null = null;

    @ManyToOne(type => OrganizationSnapShot, {nullable: true})
    organization: OrganizationSnapShot | null = null;

    @ManyToOne(type => CrawlV2, {nullable: false, eager: true})
    @Index()
    startCrawl: CrawlV2 | Promise<CrawlV2>;

    @ManyToOne(type => CrawlV2, { nullable: true, eager: true})
    @Index()
    endCrawl?: CrawlV2 | null = null;

    @Column("bool")
    current: boolean = true;

    constructor(nodeStorage: NodeStorageV2, startCrawl: CrawlV2, ip:string, port: number) {
        this.nodeStorage = nodeStorage;
        this.ip = ip;
        this.port = port;
        this.startCrawl = startCrawl;
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
        //database storage returns null when not set and node returns undefined. So no strict equality check here.
        return this.nodeDetails.alias != node.alias
            || this.nodeDetails.historyUrl != node.historyUrl
            || this.nodeDetails.homeDomain != node.homeDomain
            || this.nodeDetails.host != node.host
            || this.nodeDetails.isp != node.isp
            || this.nodeDetails.ledgerVersion != node.ledgerVersion
            || this.nodeDetails.name != node.name
            || this.nodeDetails.overlayMinVersion != node.overlayMinVersion
            || this.nodeDetails.overlayVersion != node.overlayVersion
            || this.nodeDetails.versionStr != node.versionStr;
    }

    geoDataChanged(node:Node):boolean {
        if(!this.geoData) {
            return node.geoData.latitude !== undefined || node.geoData.longitude !== undefined;
        }
        //database storage returns null when not set and node returns undefined. So no strict equality check here.
        return this.geoData.latitude != node.geoData.latitude
            || this.geoData.longitude != node.geoData.longitude;
    }

    hasNodeChanged(crawledNode: Node, organization?: Organization) {
        if (this.quorumSetChanged(crawledNode))
            return true;
        if (this.nodeIpPortChanged(crawledNode))
            return true;
        if (this.nodeDetailsChanged(crawledNode))
            return true;
        if (this.geoDataChanged(crawledNode))
            return true;
        /*if (nodeService.organizationChanged(node, organization))
            organizationChanged = true;*/

        return false
    }
}