import { Column, Entity } from 'typeorm';
import { OrganizationId } from './OrganizationId';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';
import OrganizationSnapShot from './OrganizationSnapShot';
import { OrganizationContactInformation } from './OrganizationContactInformation';
import { OrganizationValidators } from './OrganizationValidators';

/**
 * Stores the unique organization id's, regardless of versions.
 */
@Entity('organization')
export default class Organization extends VersionedEntity<OrganizationSnapShot> {
	id?: number;

	@Column('timestamptz')
	dateDiscovered: Date;

	@Column(() => OrganizationId)
	organizationId: OrganizationId;

	@Column('text', { nullable: false })
	homeDomain: string;

	get name(): string | null {
		return this.currentSnapshot().name;
	}

	get url(): string | null {
		return this.currentSnapshot().url;
	}

	get description(): string | null {
		return this.currentSnapshot().description;
	}

	get horizonUrl(): string | null {
		return this.currentSnapshot().horizonUrl;
	}

	get contactInformation(): OrganizationContactInformation {
		return this.currentSnapshot().contactInformation;
	}

	get validators(): OrganizationValidators {
		return this.currentSnapshot().validators;
	}

	updateName(name: string, time: Date) {
		if (this.name === name) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().name = name;
	}

	updateUrl(url: string, time: Date) {
		if (this.url === url) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().url = url;
	}

	updateDescription(description: string, time: Date) {
		if (this.description === description) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().description = description;
	}

	updateHorizonUrl(horizonUrl: string, time: Date) {
		if (this.horizonUrl === horizonUrl) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().horizonUrl = horizonUrl;
	}

	updateValidators(validators: OrganizationValidators, time: Date) {
		if (this.validators.equals(validators)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().validators = validators;
	}

	updateContactInformation(
		contactInformation: OrganizationContactInformation,
		time: Date
	) {
		if (this.contactInformation.equals(contactInformation)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().contactInformation = contactInformation;
	}

	private constructor(
		organizationId: OrganizationId,
		homeDomain: string,
		dateDiscovered: Date,
		snapshots: [OrganizationSnapShot]
	) {
		super(snapshots);
		this.homeDomain = homeDomain;
		this.organizationId = organizationId;
		this.dateDiscovered = dateDiscovered;
	}

	static create(
		organizationId: OrganizationId,
		homeDomain: string,
		dateDiscovered: Date
	): Organization {
		const currentSnapshot = new OrganizationSnapShot(
			dateDiscovered,
			new OrganizationValidators([]),
			OrganizationContactInformation.create({
				dba: null,
				officialEmail: null,
				phoneNumber: null,
				physicalAddress: null,
				twitter: null,
				github: null,
				keybase: null
			})
		);
		const organization = new Organization(
			organizationId,
			homeDomain,
			dateDiscovered,
			[currentSnapshot]
		);
		currentSnapshot.organization = organization;

		return organization;
	}
}
