import {
	Entity,
	Column,
	ManyToOne,
	Index,
	JoinTable,
	ManyToMany
} from 'typeorm';
import Organization from './Organization';
import Node from '../node/Node';
import { Snapshot } from '../../../core/domain/Snapshot';
import { OrganizationContactInformation } from './OrganizationContactInformation';

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
		cascade: false,
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

	organizationChanged(
		name: string,
		url: string | null,
		description: string | null,
		horizonUrl: string | null,
		validators: string[],
		contactInformation: OrganizationContactInformation
	): boolean {
		const validatorsChanged = this.validatorsChanged(validators);
		return (
			this.name !== name ||
			this.url !== url ||
			this.description !== description ||
			this.horizonUrl !== horizonUrl ||
			!this.contactInformation.equals(contactInformation) ||
			validatorsChanged
		);
	}

	validatorsChanged(validators: string[]) {
		const validatorPublicKeys = this.validators.map(
			(validator) => validator.publicKey.value
		);

		if (validatorPublicKeys.length !== validators.length) return true;
		if (
			!validatorPublicKeys.every((publicKey) => validators.includes(publicKey))
		)
			return true;

		return !validatorPublicKeys.every((publicKey) =>
			validators.includes(publicKey)
		);
	}

	isActive() {
		return this.endDate.getTime() === OrganizationSnapShot.MAX_DATE.getTime();
	}

	copy(startDate: Date): this {
		throw new Error('Method not implemented.');
	}
}
