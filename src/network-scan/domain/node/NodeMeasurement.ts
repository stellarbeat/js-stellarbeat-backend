import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import { Measurement } from '../measurement/Measurement';
import Node from './Node';

@Entity({ name: 'node_measurement_v2' })
export default class NodeMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@PrimaryColumn()
	private nodeId?: string;

	@ManyToOne(() => Node, {
		nullable: false,
		eager: true
	})
	node: Node;

	@Column('bool')
	isActive = false;

	@Column('bool')
	isValidating = false;

	@Column('bool')
	isFullValidator = false; //todo: rename to hasUpToDateHistory

	@Column('bool', { default: false })
	historyArchiveHasError = false;

	@Column('bool')
	isOverLoaded = false;

	@Column('bool', { default: false })
	isActiveInScp = false;

	@Column('bool', { default: false })
	connectivityError = false;

	@Column('bool', { default: false })
	stellarCoreVersionBehind = false;

	@Column('smallint')
	index = 0;

	@Column('smallint', { default: null, name: 'lag', nullable: true })
	private _lag: number | null = null;

	//todo: remove Node constructor parameter and make ValueObject
	constructor(time: Date, node: Node) {
		this.time = time;
		this.node = node;
	}

	set lag(lag: number | null) {
		const maxLagMS = 32767;
		if (lag === null) {
			this._lag = null;
			return;
		}

		if (lag > maxLagMS) {
			lag = maxLagMS;
		}

		if (lag < 0) {
			lag = 0;
		}

		this._lag = lag;
	}

	get lag(): number | null {
		return this._lag;
	}

	toString() {
		return `NodeMeasurement (time: ${this.time}, isActive: ${this.isActive}, isValidating: ${this.isValidating}, isFullValidator: ${this.isFullValidator}, isOverLoaded: ${this.isOverLoaded}, index: ${this.index})`;
	}
}
