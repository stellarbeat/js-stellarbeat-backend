import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import {QuorumSet} from "@stellarbeat/js-stellar-domain";

/**
* A quorumSet can be reused between nodes.
 */
@Entity('quorum_set')
export default class QuorumSetStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("varchar", {length: 64})
    hash: string;

    @Column("json")
    quorumSetJson:QuorumSet;

    constructor(hash:string, quorumSet:QuorumSet) {
        this.hash = hash;
        this.quorumSetJson = quorumSet;
    }

    static fromQuorumSet(quorumSet:QuorumSet) {
        return new this(quorumSet.hashKey, quorumSet);
    }
}