import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";
import {Node} from "@stellarbeat/js-stellar-domain";

@Entity('node_details')
export default class NodeDetailsStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column('text', {nullable: true})
    host: string | null = null;

    @Column('text', {nullable: true})
    name: string | null = null;

    @Column('text', {nullable: true})
    homeDomain: string | null = null;

    @Column('text', {nullable: true})
    historyUrl: string | null = null;

    @Column('text', {nullable: true})
    alias: string | null = null;

    @Column('text', {nullable: true})
    isp: string | null = null;

    @Column('text', {nullable: true})
    ledgerVersion: string | null = null;

    @Column('text', {nullable: true})
    overlayVersion: string | null = null;

    @Column('text', {nullable: true})
    overlayMinVersion: string | null = null;

    @Column('text', {nullable: true})
    versionStr: string | null = null;

    static fromNode(node:Node) {
        if(node.versionStr === undefined)
            return null;

        let nodeDetailsStorage = new this();

        nodeDetailsStorage.ledgerVersion = node.ledgerVersion ? node.ledgerVersion : null;
        nodeDetailsStorage.overlayVersion = node.overlayVersion ? node.overlayVersion : null;
        nodeDetailsStorage.overlayMinVersion = node.overlayMinVersion ? node.overlayMinVersion : null;
        nodeDetailsStorage.versionStr = node.versionStr ? node.versionStr : null;
        nodeDetailsStorage.host = node.host ? node.host : null;
        nodeDetailsStorage.name = node.name ? node.name : null;
        nodeDetailsStorage.homeDomain = node.homeDomain ? node.homeDomain : null;
        nodeDetailsStorage.historyUrl = node.historyUrl ? node.historyUrl : null;
        nodeDetailsStorage.alias = node.alias ? node.alias : null;
        nodeDetailsStorage.isp = node.isp ? node.isp : null;

        return nodeDetailsStorage;
    }
}