import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import Node from './Node';
import { MeasurementAggregation } from '../measurement-aggregation/MeasurementAggregation';

@Entity('node_measurement_day_v2')
export default class NodeMeasurementDay implements MeasurementAggregation {
	@Column('date', { primary: true, name: 'time' })
	protected _time: string;

	@PrimaryColumn()
	private nodeId?: string;

	@ManyToOne(() => Node, {
		nullable: false,
		eager: true
	})
	node: Node;

	@Column('smallint', { default: 0 })
	isActiveCount = 0;

	@Column('smallint', { default: 0 })
	isValidatingCount = 0;

	@Column('smallint', { default: 0 })
	isFullValidatorCount = 0;

	@Column('smallint', { default: 0 })
	isOverloadedCount = 0;

	@Column('int')
	indexSum = 0;

	@Column('smallint', { default: 0 })
	historyArchiveErrorCount = 0;

	@Column('smallint', { default: 0 })
	crawlCount = 0;

	constructor(node: Node, day: string) {
		this.node = node;
		this._time = day;
	}

	get time(): Date {
		return new Date(this._time);
	}

	toJSON(): Record<string, unknown> {
		return {
			time: this.time,
			isActiveCount: this.isActiveCount,
			isValidatingCount: this.isValidatingCount,
			isFullValidatorCount: this.isFullValidatorCount,
			isOverloadedCount: this.isOverloadedCount,
			indexSum: this.indexSum,
			historyArchiveErrorCount: this.historyArchiveErrorCount,
			crawlCount: this.crawlCount
		};
	}
}
