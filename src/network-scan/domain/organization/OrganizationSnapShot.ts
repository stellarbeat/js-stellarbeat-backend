import {
	Entity,
	Column,
	ManyToOne,
	Index,
	JoinTable,
	ManyToMany
} from 'typeorm';
import Organization from './Organization';
import { Organization as OrganizationDTO } from '@stellarbeat/js-stellar-domain';
import OrganizationMeasurement from './OrganizationMeasurement';
import { OrganizationSnapShot as DomainOrganizationSnapShot } from '@stellarbeat/js-stellar-domain';
import { OrganizationMeasurementAverage } from './OrganizationMeasurementAverage';
import Node from '../node/Node';
import { Snapshot } from '../../../core/domain/Snapshot';
import { OrganizationContactInformation } from './OrganizationContactInformation';

/**
 * Contains all versions of all organizations
 */
@Entity()
export default class OrganizationSnapShot extends Snapshot {
	@Index()
	@ManyToOne(() => Organization, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	protected _organization?: Organization;

	@ManyToMany(() => Node, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	@JoinTable({ name: 'organization_snap_shot_validators_node_public_key' })
	protected _validators: Node[];

	@Column('text', { nullable: false, name: 'name' })
	name: string;

	@Column('text', { nullable: true })
	url: string | null = null;

	@Column('text', { nullable: true })
	description: string | null = null;

	@Column('text', { nullable: true })
	horizonUrl: string | null = null;

	@Column(() => OrganizationContactInformation, { prefix: false })
	contactInformation: OrganizationContactInformation;

	constructor(
		organization: Organization,
		startDate: Date,
		name: string,
		validators: Node[]
	) {
		super(startDate);
		this.organization = organization;
		this.contactInformation = OrganizationContactInformation.create({
			dba: null,
			officialEmail: null,
			phoneNumber: null,
			physicalAddress: null,
			twitter: null,
			github: null,
			keybase: null
		});
		this._validators = validators;
		this.name = name;
	}

	set validators(validators: Node[]) {
		this._validators = validators;
	}

	get validators() {
		if (!this._validators) {
			throw new Error('Validators not hydrated');
		}

		return this._validators;
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

	organizationChanged(organizationDTO: OrganizationDTO): boolean {
		const validatorsChanged = this.validatorsChanged(organizationDTO);
		return (
			this.compare(
				this.organization.organizationId.value,
				organizationDTO.id
			) ||
			this.compare(this.organization.homeDomain, organizationDTO.homeDomain) ||
			this.compare(this.name, organizationDTO.name) ||
			this.compare(this.url, organizationDTO.url) ||
			this.compare(this.horizonUrl, organizationDTO.horizonUrl) ||
			this.compare(this.description, organizationDTO.description) ||
			this.compare(this.horizonUrl, organizationDTO.horizonUrl) ||
			!this.contactInformation.equals(
				OrganizationContactInformation.create({
					dba: organizationDTO.dba,
					officialEmail: organizationDTO.officialEmail,
					phoneNumber: organizationDTO.phoneNumber,
					physicalAddress: organizationDTO.physicalAddress,
					twitter: organizationDTO.twitter,
					github: organizationDTO.github,
					keybase: organizationDTO.keybase
				})
			) ||
			validatorsChanged
		);
	}

	protected compare(
		modelProperty: string | null,
		entityProperty: string | null
	): boolean {
		return modelProperty !== entityProperty;
	}

	validatorsChanged(organization: OrganizationDTO) {
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

	toOrganizationDTO(
		//todo: move to mapper
		time: Date,
		measurement?: OrganizationMeasurement,
		measurement24HourAverage?: OrganizationMeasurementAverage,
		measurement30DayAverage?: OrganizationMeasurementAverage
	): OrganizationDTO {
		const organization = new OrganizationDTO(
			this.organization.organizationId.value,
			this.name
		);

		organization.dateDiscovered = this.organization.dateDiscovered;
		organization.dba = this.contactInformation.dba;
		organization.url = this.url;
		organization.officialEmail = this.contactInformation.officialEmail;
		organization.phoneNumber = this.contactInformation.phoneNumber;
		organization.physicalAddress = this.contactInformation.physicalAddress;
		organization.twitter = this.contactInformation.twitter;
		organization.github = this.contactInformation.github;
		organization.description = this.description;
		organization.keybase = this.contactInformation.keybase;
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
			this.toOrganizationDTO(this.startDate)
		);
	}

	copy(startDate: Date): this {
		throw new Error('Method not implemented.');
	}
}
