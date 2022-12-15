import { Entity, Column, ManyToOne } from 'typeorm';
import OrganizationIdStorage from './OrganizationIdStorage';

export interface Measurement {
	time: Date;
}

@Entity()
export default class OrganizationMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne(() => OrganizationIdStorage, {
		primary: true,
		nullable: false,
		eager: true
	})
	organizationIdStorage: OrganizationIdStorage;

	@Column('bool')
	isSubQuorumAvailable = false;

	@Column('smallint')
	index = 0; //future proof

	constructor(time: Date, organizationId: OrganizationIdStorage) {
		this.time = time;
		this.organizationIdStorage = organizationId;
	}
}
