import { Entity, Column, ManyToOne } from 'typeorm';
import OrganizationId from '../../../domain/OrganizationId';

@Entity()
export default class OrganizationMeasurementDay {
	@Column('date', { primary: true, name: 'time' })
	protected _time: string;

	@ManyToOne(() => OrganizationId, {
		primary: true,
		nullable: false,
		eager: true
	})
	organizationIdStorage: OrganizationId;

	@Column('smallint', { default: 0 })
	isSubQuorumAvailableCount = 0;

	@Column('int')
	indexSum = 0; //future proof

	@Column('smallint', { default: 0 })
	crawlCount = 0;

	constructor(day: string, organizationId: OrganizationId) {
		this._time = day;
		this.organizationIdStorage = organizationId;
	}

	get time() {
		return new Date(this._time);
	}
}
