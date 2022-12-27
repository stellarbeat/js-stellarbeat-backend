import { Entity, Column, ManyToOne } from 'typeorm';
import { Node } from '@stellarbeat/js-stellar-domain';
import { Measurement } from './Measurement';
import VersionedNode from '../../infrastructure/database/entities/VersionedNode';

@Entity({ name: 'node_measurement_v2' })
export default class NodeMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => VersionedNode, {
		primary: true,
		nullable: false,
		eager: true
	})
	node: VersionedNode;

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

	constructor(time: Date, node: VersionedNode) {
		this.time = time;
		this.node = node;
	}

	static fromNode(time: Date, node: VersionedNode, nodeDTO: Node) {
		const nodeMeasurement = new NodeMeasurement(time, node);
		nodeMeasurement.isValidating =
			nodeDTO.isValidating === undefined ? false : nodeDTO.isValidating;
		nodeMeasurement.isOverLoaded =
			nodeDTO.overLoaded === undefined ? false : nodeDTO.overLoaded;
		nodeMeasurement.isFullValidator =
			nodeDTO.isFullValidator === undefined ? false : nodeDTO.isFullValidator;
		nodeMeasurement.isActiveInScp = nodeDTO.activeInScp;
		nodeMeasurement.isActive = nodeDTO.active;
		nodeMeasurement.index = Math.round(nodeDTO.index * 100);
		nodeMeasurement.historyArchiveHasError = nodeDTO.historyArchiveHasError;

		return nodeMeasurement;
	}

	//todo TOJSON

	toString() {
		return `NodeMeasurement (time: ${this.time}, isActive: ${this.isActive}, isValidating: ${this.isValidating}, isFullValidator: ${this.isFullValidator}, isOverLoaded: ${this.isOverLoaded}, index: ${this.index})`;
	}
}
