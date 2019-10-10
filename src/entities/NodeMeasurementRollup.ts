import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity()
export default class NodeMeasurementRollup {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("text")
    name: string;

    @Column("text", { nullable: false })
    targetTableName: String;

    @Column("bigint", {default: 0})
    lastAggregatedCrawlId: number = 0;


    constructor(name:string, targetTableName:string) {
        this.name = name;
        this.targetTableName = targetTableName;
    }
}