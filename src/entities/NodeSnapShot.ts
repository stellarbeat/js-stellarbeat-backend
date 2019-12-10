import {Entity, Column, ManyToOne, PrimaryGeneratedColumn, Index} from "typeorm";

import QuorumSetStorage from "./QuorumSetStorage";
import GeoDataStorage from "./GeoDataStorage";
import OrganizationSnapShot from "./OrganizationSnapShot";
import NodeDetailsStorage from "./NodeDetailsStorage";
import NodeStorageV2 from "./NodeStorageV2";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
export default class NodeSnapShot {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @ManyToOne(type => NodeStorageV2)
    nodeStorage: NodeStorageV2;

    @Column("text" )
    ip: string;

    @Column("integer")
    port: number;

    @ManyToOne(type => NodeDetailsStorage, {nullable: true, cascade: ['insert']})
    nodeDetails?: NodeDetailsStorage | null = null;

    // @ts-ignore
    @ManyToOne(type => QuorumSetStorage, {nullable: true, cascade: ['insert']})
    quorumSet?: QuorumSetStorage | null = null;

    @ManyToOne(type => GeoDataStorage, {nullable: true, cascade: ['insert']})
    geoData?: GeoDataStorage | null = null;

    @ManyToOne(type => OrganizationSnapShot, {nullable: true})
    organization?: OrganizationSnapShot | null = null;

    // @ts-ignore
    @Column("timestamptz")
    startDate: Date;

    // The last crawl of the current node version. Null if this is the latest version
    @Column("timestamptz")
    endDate: Date = NodeSnapShot.MAX_DATE;

    @Column("bool")
    current: boolean = true;

    constructor(nodeStorage: NodeStorageV2, ip:string, port: number, startDate: Date) {
        this.nodeStorage = nodeStorage;
        this.ip = ip;
        this.port = port;
        this.startDate = startDate;
    }

    static readonly MAX_DATE = new Date(9999, 11, 31, 23, 59, 59);

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