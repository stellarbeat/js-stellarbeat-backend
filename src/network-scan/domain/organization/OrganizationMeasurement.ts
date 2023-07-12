import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import Organization from './Organization';
import { Measurement } from '../measurement/Measurement';

@Entity()
export default class OrganizationMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@PrimaryColumn()
	private organizationId?: string;

	@ManyToOne(() => Organization, {
		nullable: false,
		eager: true
	})
	organization: Organization;

	@Column('bool')
	isSubQuorumAvailable = false; //todo: rename to isAvailable

	@Column('smallint')
	index = 0; //future proof

	constructor(time: Date, organization: Organization) {
		this.time = time;
		this.organization = organization;
	}
}
