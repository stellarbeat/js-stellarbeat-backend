import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import Organization from './Organization';
import { Measurement } from '../measurement/Measurement';
import { TomlState } from './scan/TomlState';

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

	@Column('enum', { default: TomlState.Unknown, enum: TomlState })
	tomlState: TomlState = TomlState.Unknown;

	constructor(time: Date, organization: Organization) {
		this.time = time;
		this.organization = organization;
	}
}
