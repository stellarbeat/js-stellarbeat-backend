import { Entity, Column, ManyToOne } from 'typeorm';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { Measurement } from '../measurement/Measurement';
import Node from './Node';

@Entity({ name: 'node_measurement_v2' })
export default class NodeMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => Node, {
		primary: true,
		nullable: false,
		eager: true
	})
	node: Node;

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

	//todo: remove Node constructor parameter and make ValueObject
	constructor(time: Date, node: Node) {
		this.time = time;
		this.node = node;
	}

	//todo: move to mapper
	static fromNodeDTO(time: Date, node: Node, nodeDTO: NodeDTO) {
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

	toString() {
		return `NodeMeasurement (time: ${this.time}, isActive: ${this.isActive}, isValidating: ${this.isValidating}, isFullValidator: ${this.isFullValidator}, isOverLoaded: ${this.isOverLoaded}, index: ${this.index})`;
	}
}
