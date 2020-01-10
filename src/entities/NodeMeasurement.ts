import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
export default class NodeMeasurement {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("timestamptz")
    time: Date;

    @Index()
    @Column("varchar", { length: 56 })
    publicKey: String;

    @Column("bool")
    isActive: boolean = false;

    @Column("bool")
    isValidating: boolean = false;

    @Column("bool")
    isOverLoaded: boolean = false;

    constructor(publicKey:string, time = new Date()) {
        this.publicKey = publicKey;
        this.time = time;
    }
}