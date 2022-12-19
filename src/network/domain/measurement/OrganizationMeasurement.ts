import { Entity, Column, ManyToOne } from 'typeorm';
import OrganizationId from '../OrganizationId';
import { Measurement } from './Measurement';

@Entity()
export default class OrganizationMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => OrganizationId, {
		primary: true,
		nullable: false,
		eager: true
	})
	organizationIdStorage: OrganizationId;

	@Column('bool')
	isSubQuorumAvailable = false;

	@Column('smallint')
	index = 0; //future proof

	constructor(time: Date, organizationId: OrganizationId) {
		this.time = time;
		this.organizationIdStorage = organizationId;
	}
}
