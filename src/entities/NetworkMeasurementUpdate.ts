import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";

/*
@Deprecated
 */
@Entity()
export default class NetworkMeasurementUpdate {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("bigint", {default: 0})
    startCrawlId: number = 0;
    @Column("bigint", {default: 0})
    endCrawlId: number = 0;

}