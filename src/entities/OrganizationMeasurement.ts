import { Entity, Column, ManyToOne } from 'typeorm';
import OrganizationIdStorage from './OrganizationIdStorage';

@Entity()
export default class OrganizationMeasurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@ManyToOne((type) => OrganizationIdStorage, {
		primary: true,
		nullable: false,
		eager: true
	})
	organizationIdStorage: OrganizationIdStorage;

	@Column('bool')
	isSubQuorumAvailable: boolean = false;

	@Column('smallint')
	index: number = 0; //future proof

	constructor(time: Date, organizationId: OrganizationIdStorage) {
		this.time = time;
		this.organizationIdStorage = organizationId;
	}
}
