import { Entity, Column, ManyToOne } from 'typeorm';
import PublicKey from '../../../domain/PublicKey';

@Entity()
export default class NodeMeasurementDayV2 {
	@Column('date', { primary: true, name: 'time' })
	protected _time: string;

	@ManyToOne(() => PublicKey, {
		primary: true,
		nullable: false,
		eager: true
	})
	nodePublicKeyStorage: PublicKey;

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

	constructor(nodePublicKeyStorage: PublicKey, day: string) {
		this.nodePublicKeyStorage = nodePublicKeyStorage;
		this._time = day;
	}

	get time(): Date {
		return new Date(this._time);
	}
}
