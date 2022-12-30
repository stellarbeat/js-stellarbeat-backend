import { Entity, Column, ManyToOne } from 'typeorm';
import VersionedOrganization from '../VersionedOrganization';
import { MeasurementAggregation } from './MeasurementAggregation';

@Entity()
export default class OrganizationMeasurementDay
	implements MeasurementAggregation
{
	@Column('date', { primary: true, name: 'time' })
	protected _time: string;

	@ManyToOne(() => VersionedOrganization, {
		primary: true,
		nullable: false,
		eager: true
	})
	organization: VersionedOrganization;

	@Column('smallint', { default: 0 })
	isSubQuorumAvailableCount = 0;

	@Column('int')
	indexSum = 0; //future proof

	@Column('smallint', { default: 0 })
	crawlCount = 0;

	constructor(day: string, organization: VersionedOrganization) {
		this._time = day;
		this.organization = organization;
	}

	get time() {
		return new Date(this._time);
	}

	toJSON(): Record<string, unknown> {
		return {
			time: this.time,
			isSubQuorumAvailableCount: this.isSubQuorumAvailableCount,
			indexSum: this.indexSum,
			crawlCount: this.crawlCount
		};
	}
}
