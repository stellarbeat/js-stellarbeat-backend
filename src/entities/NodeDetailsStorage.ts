import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";

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
}