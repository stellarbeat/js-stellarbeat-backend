import { Column, Entity, Index, OneToMany } from 'typeorm';
import { OrganizationId } from './OrganizationId';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';
import OrganizationSnapShot from './OrganizationSnapShot';
import { OrganizationContactInformation } from './OrganizationContactInformation';
import { OrganizationValidators } from './OrganizationValidators';
import Node from '../node/Node';
import OrganizationMeasurement from './OrganizationMeasurement';
import { TomlState } from './scan/TomlState';

@Entity('organization')
export default class Organization extends VersionedEntity<OrganizationSnapShot> {
	id?: number;

	@Column('timestamptz')
	dateDiscovered: Date;

	@Column(() => OrganizationId)
	organizationId: OrganizationId;

	@OneToMany(() => OrganizationSnapShot, (snapshot) => snapshot._organization, {
		cascade: false,
		nullable: false
	})
	protected _snapshots?: OrganizationSnapShot[];

	@OneToMany(
		() => OrganizationMeasurement,
		(measurement) => measurement.organization,
		{
			cascade: false
		}
	)
	protected _measurements: OrganizationMeasurement[];

	@Index({ unique: true }) //update organization set home_domain = organizationIdValue where home_domain is null;
	@Column('text', { nullable: false })
	homeDomain: string;

	latestMeasurement(): OrganizationMeasurement | null {
		if (this._measurements === undefined)
			throw new Error('measurements not hydrated');
		return this._measurements[this._measurements.length - 1] || null;
	}

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
		snapshots: [OrganizationSnapShot],
		measurements: OrganizationMeasurement[]
	) {
		super(snapshots);
		this.homeDomain = homeDomain;
		this.organizationId = organizationId;
		this.dateDiscovered = dateDiscovered;
		this._measurements = measurements;
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
		return new Organization(
			organizationId,
			homeDomain,
			dateDiscovered,
			[currentSnapshot],
			[]
		);
	}

	//todo: make protected after refactoring
	currentSnapshot(): OrganizationSnapShot {
		return super.currentSnapshot();
	}

	addMeasurement(measurement: OrganizationMeasurement) {
		this._measurements.push(measurement);
	}

	updateAvailability(validators: Node[], time: Date): void {
		let measurement = this.latestMeasurement();
		if (measurement === null || measurement.time.getTime() !== time.getTime()) {
			measurement = new OrganizationMeasurement(time, this);
			this._measurements.push(measurement);
		}
		const validatingNodesCount = validators
			.filter((validator) => this.validators.contains(validator.publicKey))
			.filter(
				(validator) => validator.latestMeasurement()?.isValidating
			).length;

		measurement.isSubQuorumAvailable =
			validatingNodesCount >= this.availabilityThreshold();
	}

	updateTomlState(tomlState: TomlState, time: Date): void {
		let measurement = this.latestMeasurement();
		if (measurement === null || measurement.time.getTime() !== time.getTime()) {
			measurement = new OrganizationMeasurement(time, this);
			this._measurements.push(measurement);
		}
		measurement.tomlState = tomlState;
	}

	isAvailable(): boolean {
		const measurement = this.latestMeasurement();
		return measurement?.isSubQuorumAvailable || false;
	}

	availabilityThreshold(): number {
		if (this.validators.value.length === 0) return Number.MAX_SAFE_INTEGER;

		return Math.floor(
			this.validators.value.length - (this.validators.value.length - 1) / 2
		);
	}
}
