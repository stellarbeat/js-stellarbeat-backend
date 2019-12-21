import {Entity, Column, ManyToOne, PrimaryGeneratedColumn, Index} from "typeorm";

import QuorumSetStorage from "./QuorumSetStorage";
import GeoDataStorage from "./GeoDataStorage";
import OrganizationSnapShot from "./OrganizationSnapShot";
import NodeDetailsStorage from "./NodeDetailsStorage";
import NodePublicKey from "./NodePublicKey";
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
    @ManyToOne(type => NodePublicKey, {nullable: false, cascade: ['insert'], eager: true})
    nodePublicKey: NodePublicKey;

    @Column("text" )
    ip: string;

    @Column("integer")
    port: number;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => NodeDetailsStorage, {nullable: true, cascade: ['insert'], eager: true})
    nodeDetails?: NodeDetailsStorage | null;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => QuorumSetStorage, {nullable: true, cascade: ['insert'], eager: true})
    quorumSet?: QuorumSetStorage | null;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => GeoDataStorage, {nullable: true, cascade: ['insert'], eager: true})
    geoData?: GeoDataStorage | null = null;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => OrganizationSnapShot, {nullable: true, cascade: ['insert'], eager: false})
    organizationSnapShot?: OrganizationSnapShot | null;

    @ManyToOne(type => CrawlV2, {nullable: false, cascade: ['insert'], eager: true})
    @Index()
    startCrawl: CrawlV2 | Promise<CrawlV2>;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => CrawlV2, { nullable: true, cascade: ['insert'], eager: true})
    @Index()
    endCrawl?: CrawlV2 | null;

    @Column("bool")
    current: boolean = true;

    //typeOrm does not fill in constructor parameters. should be fixed in a later version.
    constructor(nodeStorage: NodePublicKey, startCrawl: CrawlV2, ip:string, port: number) {
        this.nodePublicKey = nodeStorage;
        this.ip = ip;
        this.port = port;
        this.startCrawl = startCrawl;
    }

    quorumSetChanged(node: Node): boolean {
        if(this.quorumSet === undefined){
            throw new Error('QuorumSet not loaded from database');
        }
        if(this.quorumSet === null)
            return node.quorumSet.validators.length > 0;

        return this.quorumSet.hash !== node.quorumSet.hashKey;
    }

    nodeIpPortChanged(node: Node):boolean {
        return this.ip !== node.ip
            || this.port !== node.port;
    }

    nodeDetailsChanged(node: Node):boolean {
        if(this.nodeDetails === undefined){
            throw new Error('NodeDetails not loaded from database');
        }
        if(this.nodeDetails === null)
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
        if(this.geoData === undefined) {
            throw new Error('GeoData not loaded from database');
        }
        if(this.geoData === null) {
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