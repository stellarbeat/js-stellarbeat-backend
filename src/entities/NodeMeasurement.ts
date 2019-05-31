import {Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
export default class NodeMeasurement {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @PrimaryColumn("timestamptz")
    time: Date;

    @Column("varchar", { length: 56 })
    publicKey: String;
    @Column("bool")
    isActive: Boolean = false;

    @Column("bool")
    isValidating: Boolean = false;

    @Column("bool")
    isOverLoaded: Boolean = false;

    constructor(publicKey:string, time = new Date()) {
        this.publicKey = publicKey;
        this.time = time;
    }
}