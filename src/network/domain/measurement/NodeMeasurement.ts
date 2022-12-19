import { Entity, Column, ManyToOne } from 'typeorm';
import PublicKey from '../PublicKey';
import { Node } from '@stellarbeat/js-stellar-domain';
import { Measurement } from './Measurement';

@Entity({ name: 'node_measurement_v2' })
export default class NodeMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => PublicKey, {
		primary: true,
		nullable: false,
		eager: true
	})
	nodePublicKeyStorage: PublicKey;

	@Column('bool')
	isActive = false;

	@Column('bool')
	isValidating = false;

	@Column('bool')
	isFullValidator = false;

	@Column('bool', { default: false })
	historyArchiveHasError = false;

	@Column('bool')
	isOverLoaded = false;

	@Column('bool', { default: false })
	isActiveInScp = false;

	@Column('smallint')
	index = 0;

	constructor(time: Date, nodeStorage: PublicKey) {
		this.time = time;
		this.nodePublicKeyStorage = nodeStorage;
	}

	static fromNode(time: Date, nodeStorage: PublicKey, node: Node) {
		const nodeMeasurement = new NodeMeasurement(time, nodeStorage);
		nodeMeasurement.isValidating =
			node.isValidating === undefined ? false : node.isValidating;
		nodeMeasurement.isOverLoaded =
			node.overLoaded === undefined ? false : node.overLoaded;
		nodeMeasurement.isFullValidator =
			node.isFullValidator === undefined ? false : node.isFullValidator;
		nodeMeasurement.isActiveInScp = node.activeInScp;
		nodeMeasurement.isActive = node.active;
		nodeMeasurement.index = Math.round(node.index * 100);
		nodeMeasurement.historyArchiveHasError = node.historyArchiveHasError;

		return nodeMeasurement;
	}

	toString() {
		return `NodeMeasurement (time: ${this.time}, isActive: ${this.isActive}, isValidating: ${this.isValidating}, isFullValidator: ${this.isFullValidator}, isOverLoaded: ${this.isOverLoaded}, index: ${this.index})`;
	}
}
