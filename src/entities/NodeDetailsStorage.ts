import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";
import {Node} from "@stellarbeat/js-stellar-domain";

@Entity('node_details')
export default class NodeDetailsStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column('text', {nullable: true})
    host?: string;

    @Column('text', {nullable: true})
    name?: string;

    @Column('text', {nullable: true})
    homeDomain?: string;

    @Column('text', {nullable: true})
    historyUrl?: string;

    @Column('text', {nullable: true})
    alias?: string;

    @Column('text', {nullable: true})
    isp?: string;

    @Column('text', {nullable: false})
    ledgerVersion: string;

    @Column('text', {nullable: false})
    overlayVersion: string;

    @Column('text', {nullable: false})
    overlayMinVersion: string;

    @Column('text', {nullable: false})
    versionStr: string;

    constructor(ledgerVersion: string, overlayVersion: string, overlayMinVersion: string, versionStr: string) {
        this.ledgerVersion = ledgerVersion;
        this.overlayVersion = overlayVersion;
        this.overlayMinVersion = overlayMinVersion;
        this.versionStr = versionStr;
    }

    static fromNode(node:Node) {
        if(node.versionStr === undefined)
            return undefined;

        let nodeDetailsStorage = new this(
            node.ledgerVersion,
            node.overlayVersion,
            node.overlayMinVersion,
            node.versionStr
        );
        nodeDetailsStorage.host = node.host;
        nodeDetailsStorage.name = node.name;
        nodeDetailsStorage.homeDomain = node.homeDomain;
        nodeDetailsStorage.historyUrl = node.historyUrl;
        nodeDetailsStorage.alias = node.alias;
        nodeDetailsStorage.isp = node.isp;

        return nodeDetailsStorage;
    }
}