import {Entity, Column, ManyToOne} from "typeorm";
import NodePublicKeyStorage from "./NodePublicKeyStorage";
import {Node} from "@stellarbeat/js-stellar-domain";

@Entity()
export default class NodeMeasurementV2 {

    @Column("timestamptz", {primary: true})
    time: Date;

    @ManyToOne(type => NodePublicKeyStorage, {primary: true, nullable: false, eager: true})
    nodePublicKeyStorage: NodePublicKeyStorage;

    @Column("bool")
    isActive: boolean = false;

    @Column("bool")
    isValidating: boolean = false;

    @Column("bool")
    isFullValidator: boolean = false;

    @Column("bool")
    isOverLoaded: boolean = false;

    @Column("smallint")
    index: number = 0;

    constructor(time: Date, nodeStorage:NodePublicKeyStorage) {
        this.time = time;
        this.nodePublicKeyStorage = nodeStorage;
    }

    static fromNode(time:Date, nodeStorage:NodePublicKeyStorage, node:Node){
        let nodeMeasurement = new NodeMeasurementV2(time, nodeStorage);
        nodeMeasurement.isValidating = node.isValidating === undefined ? false : node.isValidating;
        nodeMeasurement.isOverLoaded = node.overLoaded === undefined ? false : node.overLoaded;
        nodeMeasurement.isFullValidator = node.isFullValidator  === undefined ? false : node.isFullValidator;
        nodeMeasurement.isActive = node.active;
        nodeMeasurement.index = Math.round(node.index * 100);

        return nodeMeasurement;
    }

    toString(){
        return `NodeMeasurement (time: ${this.time}, nodePublicKeyId: ${this.nodePublicKeyStorage.id}, isActive: ${this.isActive}, isValidating: ${this.isValidating}, isFullValidator: ${this.isFullValidator}, isOverLoaded: ${this.isOverLoaded}, index: ${this.index})`;
    }
}