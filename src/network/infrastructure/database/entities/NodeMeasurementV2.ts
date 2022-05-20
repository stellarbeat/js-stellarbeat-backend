import { Entity, Column, ManyToOne } from 'typeorm';
import NodePublicKeyStorage from './NodePublicKeyStorage';
import { Node } from '@stellarbeat/js-stellar-domain';

@Entity()
export default class NodeMeasurementV2 {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => NodePublicKeyStorage, {
		primary: true,
		nullable: false,
		eager: true
	})
	nodePublicKeyStorage: NodePublicKeyStorage;

	@Column('bool')
	isActive = false;

	@Column('bool')
	isValidating = false;

	@Column('bool')
	isFullValidator = false;

	@Column('bool', { default: false })
	historyArchiveGap = false;

	@Column('bool')
	isOverLoaded = false;

	@Column('bool', { default: false })
	isActiveInScp = false;

	@Column('smallint')
	index = 0;

	constructor(time: Date, nodeStorage: NodePublicKeyStorage) {
		this.time = time;
		this.nodePublicKeyStorage = nodeStorage;
	}

	static fromNode(time: Date, nodeStorage: NodePublicKeyStorage, node: Node) {
		const nodeMeasurement = new NodeMeasurementV2(time, nodeStorage);
		nodeMeasurement.isValidating =
			node.isValidating === undefined ? false : node.isValidating;
		nodeMeasurement.isOverLoaded =
			node.overLoaded === undefined ? false : node.overLoaded;
		nodeMeasurement.isFullValidator =
			node.isFullValidator === undefined ? false : node.isFullValidator;
		nodeMeasurement.isActiveInScp = node.activeInScp;
		nodeMeasurement.isActive = node.active;
		nodeMeasurement.index = Math.round(node.index * 100);
		nodeMeasurement.historyArchiveGap = node.historyArchiveGap;

		return nodeMeasurement;
	}

	toString() {
		return `NodeMeasurement (time: ${this.time}, nodePublicKeyId: ${this.nodePublicKeyStorage.id}, isActive: ${this.isActive}, isValidating: ${this.isValidating}, isFullValidator: ${this.isFullValidator}, isOverLoaded: ${this.isOverLoaded}, index: ${this.index})`;
	}
}
