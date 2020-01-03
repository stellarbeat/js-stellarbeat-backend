import {Entity, Column, ManyToOne} from "typeorm";
import NodePublicKeyStorage from "./NodePublicKeyStorage";

@Entity()
export default class NodeMeasurementDayV2 {

    @Column("timestamptz", {primary: true})
    day: Date;

    @ManyToOne(type => NodePublicKeyStorage, {primary: true, nullable: false, eager: true})
    nodePublicKeyStorage: NodePublicKeyStorage;

    @Column("smallint", {default: 0})
    isActiveCount: number = 0;

    @Column("smallint", {default: 0})
    isValidatingCount: number = 0;

    @Column("smallint", {default: 0})
    isFullValidatorCount: number = 0;

    @Column("smallint", {default: 0})
    isOverloadedCount: number = 0;

    @Column("int")
    indexSum: number = 0;
    
    @Column("smallint", {default: 0})
    nodeCrawlCount:number = 0;

    constructor(nodePublicKeyStorage:NodePublicKeyStorage, day = new Date()) {
        this.nodePublicKeyStorage = nodePublicKeyStorage;
        this.day = day;
    }
}