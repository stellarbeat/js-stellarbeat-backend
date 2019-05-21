import {Entity, Column, PrimaryColumn} from "typeorm";

@Entity()
export default class NodeStatistic {

    @PrimaryColumn("timestamptz")
    time: Date = new Date();

    @Column("varchar")
    publicKey: String;
    @Column("bool")
    isActive: Boolean = false;

    @Column("bool")
    isValidating: Boolean = false;

    @Column("bool")
    isOverloaded: Boolean = false;

    constructor(publicKey:string) {
        this.publicKey = publicKey;
    }

}