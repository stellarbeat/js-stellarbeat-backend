import {Entity, Column, PrimaryGeneratedColumn} from "typeorm";

/*
@Deprecated
 */
@Entity()
export default class NetworkMeasurementUpdate {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("int", {default: 0})
    startCrawlId: number = 0;
    @Column("int", {default: 0})
    endCrawlId: number = 0;

}