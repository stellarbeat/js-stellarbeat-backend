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
import PublicKey from '../node/PublicKey';
import { plainToInstance } from 'class-transformer';
import { QuorumSet } from '../network/QuorumSet';

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
	protected _validators?: Node[];

	@Column({
		type: 'json',
		nullable: true, //after migration set to true
		name: 'validators',
		transformer: {
			to: (value) => value,
			from: (publicKeys) => {
				//@ts-ignore
				return publicKeys.map((publicKey) =>
					//@ts-ignore
					plainToInstance(PublicKey, publicKey)
				);
			}
		}
	})
	protected _validatorsNew: PublicKey[] = [];

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
		validators: PublicKey[]
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
		this._validatorsNew = validators;
		this.name = name;
	}

	set validators(validators: PublicKey[]) {
		this._validatorsNew = validators;
	}

	get validators() {
		return this._validatorsNew;
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
		if (this.validators.length !== validators.length) return true;
		if (
			!this.validators.every((publicKey) =>
				validators.includes(publicKey.value)
			)
		)
			return true;

		return !this.validators.every((publicKey) =>
			validators.includes(publicKey.value)
		);
	}

	isActive() {
		return this.endDate.getTime() === OrganizationSnapShot.MAX_DATE.getTime();
	}

	copy(startDate: Date): this {
		throw new Error('Method not implemented.');
	}
}
