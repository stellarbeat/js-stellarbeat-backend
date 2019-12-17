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
    quorumSetJson:string;

    constructor(hash:string, quorumSet:QuorumSet) {
        this.hash = hash;
        this.quorumSetJson = JSON.stringify(quorumSet);
    }

    get quorumSet() {
        return QuorumSet.fromJSON(this.quorumSetJson);
    }

    static fromQuorumSet(quorumSet:QuorumSet) {
        if(quorumSet.validators.length === 0 && quorumSet.innerQuorumSets.length === 0)
            return null;

        return new this(quorumSet.hashKey, quorumSet);
    }
}