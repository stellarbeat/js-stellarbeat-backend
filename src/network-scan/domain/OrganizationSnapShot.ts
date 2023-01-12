import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	ManyToOne,
	Index,
	JoinTable,
	ManyToMany
} from 'typeorm';
import VersionedOrganization from './VersionedOrganization';
import { Organization } from '@stellarbeat/js-stellar-domain';
import { SnapShot } from './NodeSnapShot';
import OrganizationMeasurement from './measurement/OrganizationMeasurement';
import { OrganizationSnapShot as DomainOrganizationSnapShot } from '@stellarbeat/js-stellar-domain';
import { OrganizationMeasurementAverage } from './measurement-aggregation/OrganizationMeasurementAverage';
import VersionedNode from './VersionedNode';

/**
 * Contains all versions of all organizations
 */
@Entity()
export default class OrganizationSnapShot implements SnapShot {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Column('timestamptz', { nullable: false })
	@Index()
	public startDate: Date;

	@Column('timestamptz', { nullable: false })
	@Index()
	public endDate: Date = OrganizationSnapShot.MAX_DATE;

	@Index()
	@ManyToOne(() => VersionedOrganization, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	protected _organization?: VersionedOrganization;

	//undefined if not retrieved from database.
	@ManyToMany(() => VersionedNode, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	@JoinTable({ name: 'organization_snap_shot_validators_node_public_key' })
	protected _validators?: VersionedNode[];

	@Column('text', { nullable: false, name: 'name' })
	protected _name?: string;

	@Column('text', { nullable: true })
	dba: string | null = null;

	@Column('text', { nullable: true })
	url: string | null = null;

	@Column('text', { nullable: true })
	officialEmail: string | null = null;

	@Column('text', { nullable: true })
	phoneNumber: string | null = null;

	@Column('text', { nullable: true })
	physicalAddress: string | null = null;

	@Column('text', { nullable: true })
	twitter: string | null = null;

	@Column('text', { nullable: true })
	github: string | null = null;

	@Column('text', { nullable: true })
	description: string | null = null;

	@Column('text', { nullable: true })
	keybase: string | null = null;

	@Column('text', { nullable: true })
	horizonUrl: string | null = null;

	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	constructor(organization: VersionedOrganization, startDate: Date) {
		this.organization = organization;
		this.startDate = startDate;
	}

	set validators(validators: VersionedNode[]) {
		this._validators = validators;
	}

	get validators() {
		if (this._validators === undefined) {
			throw new Error('Validators not loaded from database');
		}

		return this._validators;
	}

	get name() {
		if (this._name === undefined) {
			throw new Error('name not loaded from database');
		}

		return this._name;
	}

	set name(value: string) {
		this._name = value;
	}

	set organization(organization: VersionedOrganization) {
		this._organization = organization;
	}

	get organization() {
		if (this._organization === undefined) {
			throw new Error('organization not loaded from database');
		}

		return this._organization;
	}

	organizationChanged(organization: Organization): boolean {
		const validatorsChanged = this.validatorsChanged(organization);
		return (
			this.compare(this.organization.organizationId.value, organization.id) ||
			this.compare(this.organization.homeDomain, organization.homeDomain) ||
			this.compare(this.name, organization.name) ||
			this.compare(this.dba, organization.dba) ||
			this.compare(this.url, organization.url) ||
			this.compare(this.horizonUrl, organization.horizonUrl) ||
			this.compare(this.officialEmail, organization.officialEmail) ||
			this.compare(this.phoneNumber, organization.phoneNumber) ||
			this.compare(this.physicalAddress, organization.physicalAddress) ||
			this.compare(this.twitter, organization.twitter) ||
			this.compare(this.github, organization.github) ||
			this.compare(this.description, organization.description) ||
			this.compare(this.keybase, organization.keybase) ||
			this.compare(this.horizonUrl, organization.horizonUrl) ||
			validatorsChanged
		);
	}

	protected compare(
		modelProperty: string | null,
		entityProperty: string | null
	): boolean {
		return modelProperty !== entityProperty;
	}

	validatorsChanged(organization: Organization) {
		const validatorPublicKeys = this.validators.map(
			(validator) => validator.publicKey.value
		);

		if (validatorPublicKeys.length !== organization.validators.length)
			return true;
		if (
			!validatorPublicKeys.every((publicKey) =>
				organization.validators.includes(publicKey)
			)
		)
			return true;

		return !validatorPublicKeys.every((publicKey) =>
			organization.validators.includes(publicKey)
		);
	}

	toOrganization(
		//todo: move to factory
		time: Date,
		measurement?: OrganizationMeasurement,
		measurement24HourAverage?: OrganizationMeasurementAverage,
		measurement30DayAverage?: OrganizationMeasurementAverage
	) {
		const organization = new Organization(
			this.organization.organizationId.value,
			this.name
		);

		organization.dateDiscovered = this.organization.dateDiscovered;
		organization.dba = this.dba;
		organization.url = this.url;
		organization.officialEmail = this.officialEmail;
		organization.phoneNumber = this.phoneNumber;
		organization.physicalAddress = this.physicalAddress;
		organization.twitter = this.twitter;
		organization.github = this.github;
		organization.description = this.description;
		organization.keybase = this.keybase;
		organization.horizonUrl = this.horizonUrl;
		organization.homeDomain = this.organization.homeDomain;

		this.validators.forEach((validator) => {
			organization.validators.push(validator.publicKey.value);
		});

		if (measurement) {
			organization.subQuorumAvailable = measurement.isSubQuorumAvailable;
		}

		if (measurement24HourAverage) {
			organization.has24HourStats = true;
			organization.subQuorum24HoursAvailability =
				measurement24HourAverage.isSubQuorumAvailableAvg;
		}

		if (measurement30DayAverage) {
			organization.has30DayStats = true;
			organization.subQuorum30DaysAvailability =
				measurement30DayAverage.isSubQuorumAvailableAvg;
		}

		return organization;
	}

	isActive() {
		return this.endDate.getTime() === OrganizationSnapShot.MAX_DATE.getTime();
	}

	toJSON(): DomainOrganizationSnapShot {
		return new DomainOrganizationSnapShot(
			this.startDate,
			this.endDate,
			this.toOrganization(this.startDate)
		);
	}
}