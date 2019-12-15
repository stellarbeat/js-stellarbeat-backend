import {Entity, Column, PrimaryGeneratedColumn, Index, OneToMany} from "typeorm";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

import NodeSnapShot from "./NodeSnapShot";

@Entity("node_v2")
export default class NodeStorageV2 {

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    @Column("varchar", {length: 56})
    @Index({unique: true})
    publicKey: PublicKey;

    // @ts-ignore
    @OneToMany(type => NodeSnapShot, node_snap_shot => node_snap_shot.nodeStorage, {
        lazy: false,
        eager: false,
        persistence: false
    })
    snapShots: NodeSnapShot[]|null = null;

    latestSnapshot?: NodeSnapShot | null;

    @Column("timestamptz")
    dateDiscovered: Date;

    constructor(publicKey: PublicKey, dateDiscovered = new Date()) {
        this.publicKey = publicKey;
        this.dateDiscovered = dateDiscovered;
    }
}