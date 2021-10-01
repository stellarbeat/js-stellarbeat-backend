import { Entity, Column, ManyToOne } from 'typeorm';
import NodePublicKeyStorage from './NodePublicKeyStorage';

@Entity()
export default class NodeMeasurementDayV2 {
	@Column('date', { primary: true, name: 'time' })
	protected _time: string;

	@ManyToOne((type) => NodePublicKeyStorage, {
		primary: true,
		nullable: false,
		eager: true
	})
	nodePublicKeyStorage: NodePublicKeyStorage;

	@Column('smallint', { default: 0 })
	isActiveCount: number = 0;

	@Column('smallint', { default: 0 })
	isValidatingCount: number = 0;

	@Column('smallint', { default: 0 })
	isFullValidatorCount: number = 0;

	@Column('smallint', { default: 0 })
	isOverloadedCount: number = 0;

	@Column('int')
	indexSum: number = 0;

	@Column('smallint', { default: 0 })
	crawlCount: number = 0;

	constructor(nodePublicKeyStorage: NodePublicKeyStorage, day: string) {
		this.nodePublicKeyStorage = nodePublicKeyStorage;
		this._time = day;
	}

	get time(): Date {
		return new Date(this._time);
	}
}
