import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import Organization from './Organization';
import { Snapshot } from '../../../core/domain/Snapshot';
import { OrganizationContactInformation } from './OrganizationContactInformation';
import { OrganizationValidators } from './OrganizationValidators';

@Entity()
export default class OrganizationSnapShot extends Snapshot {
	@Index()
	@ManyToOne(() => Organization, {
		nullable: false,
		cascade: false,
		eager: true //todo: Move to false after Snapshot is no longer used as aggregate
	})
	public _organization?: Organization;

	@Column(() => OrganizationValidators, { prefix: false })
	public validators: OrganizationValidators;

	@Column('text', { nullable: true, name: 'name' })
	name: string | null = null;

	@Column('text', { nullable: true })
	url: string | null = null;

	@Column('text', { nullable: true })
	description: string | null = null;

	@Column('text', { nullable: true })
	horizonUrl: string | null = null;

	@Column(() => OrganizationContactInformation, { prefix: false })
	contactInformation: OrganizationContactInformation;

	constructor(
		startDate: Date,
		validators: OrganizationValidators,
		contactInformation: OrganizationContactInformation
	) {
		super(startDate);
		this.contactInformation = contactInformation;
		this.validators = validators;
	}

	set organization(organization: Organization) {
		this._organization = organization;
	}

	get organization() {
		if (this._organization === undefined) {
			throw new Error('organization not loaded from database');
		}

		return this._organization;
	}

	copy(startDate: Date): this {
		const copy = new OrganizationSnapShot(
			startDate,
			this.validators,
			this.contactInformation
		);
		copy.url = this.url;
		copy.name = this.name;
		copy.description = this.description;
		copy.horizonUrl = this.horizonUrl;

		return copy as this;
	}
}
