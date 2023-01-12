import { Entity, Column, ManyToOne } from 'typeorm';
import VersionedOrganization from './VersionedOrganization';
import { Measurement } from '../measurement/Measurement';

@Entity()
export default class OrganizationMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => VersionedOrganization, {
		primary: true,
		nullable: false,
		eager: true
	})
	organization: VersionedOrganization;

	@Column('bool')
	isSubQuorumAvailable = false;

	@Column('smallint')
	index = 0; //future proof

	constructor(time: Date, organizationId: VersionedOrganization) {
		this.time = time;
		this.organization = organizationId;
	}
}
