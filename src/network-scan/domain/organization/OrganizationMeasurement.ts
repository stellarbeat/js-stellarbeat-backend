import { Entity, Column, ManyToOne } from 'typeorm';
import Organization from './Organization';
import { Measurement } from '../measurement/Measurement';

@Entity()
export default class OrganizationMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => Organization, {
		primary: true,
		nullable: false,
		eager: true
	})
	organization: Organization;

	@Column('bool')
	isSubQuorumAvailable = false;

	@Column('smallint')
	index = 0; //future proof

	constructor(time: Date, organizationId: Organization) {
		this.time = time;
		this.organization = organizationId;
	}
}
