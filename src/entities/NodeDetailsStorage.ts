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

    @Column('text', {nullable: true})
    ledgerVersion?: string;

    @Column('text', {nullable: true})
    overlayVersion?: string;

    @Column('text', {nullable: true})
    overlayMinVersion?: string;

    @Column('text', {nullable: true})
    versionStr?: string;

    static fromNode(node:Node) {
        let nodeDetailsStorage = new this();
        nodeDetailsStorage.host = node.host;
        nodeDetailsStorage.name = node.name;
        nodeDetailsStorage.homeDomain = node.homeDomain;
        nodeDetailsStorage.historyUrl = node.historyUrl;
        nodeDetailsStorage.alias = node.alias;
        nodeDetailsStorage.isp = node.isp;
        nodeDetailsStorage.ledgerVersion = node.ledgerVersion;
        nodeDetailsStorage.overlayMinVersion = node.overlayMinVersion;
        nodeDetailsStorage.overlayVersion = node.overlayVersion;
        nodeDetailsStorage.versionStr = node.versionStr;

        return nodeDetailsStorage;
    }
}