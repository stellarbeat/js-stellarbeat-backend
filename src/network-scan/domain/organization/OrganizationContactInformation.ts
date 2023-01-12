import { ValueObject } from '../../../core/domain/ValueObject';
import { Column } from 'typeorm';

export interface OrganizationContactInformationProps {
	dba: string | null;
	officialEmail: string | null;
	phoneNumber: string | null;
	physicalAddress: string | null;
	twitter: string | null;
	github: string | null;
	keybase: string | null;
}

export class OrganizationContactInformation extends ValueObject {
	@Column('text', { nullable: true })
	dba: string | null = null;

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
	keybase: string | null = null;

	private constructor(
		dba: string | null = null,
		officialEmail: string | null = null,
		phoneNumber: string | null = null,
		physicalAddress: string | null = null,
		twitter: string | null = null,
		github: string | null = null,
		keybase: string | null = null
	) {
		super();
		this.dba = dba;
		this.officialEmail = officialEmail;
		this.phoneNumber = phoneNumber;
		this.physicalAddress = physicalAddress;
		this.twitter = twitter;
		this.github = github;
		this.keybase = keybase;
	}

	static create(
		props: OrganizationContactInformationProps
	): OrganizationContactInformation {
		const contactInformation = new OrganizationContactInformation();
		contactInformation.dba = props.dba;
		contactInformation.officialEmail = props.officialEmail;
		contactInformation.phoneNumber = props.phoneNumber;
		contactInformation.physicalAddress = props.physicalAddress;
		contactInformation.twitter = props.twitter;
		contactInformation.github = props.github;
		contactInformation.keybase = props.keybase;

		return contactInformation;
	}

	equals(other: this): boolean {
		return (
			this.dba === other.dba &&
			this.officialEmail === other.officialEmail &&
			this.phoneNumber === other.phoneNumber &&
			this.physicalAddress === other.physicalAddress &&
			this.twitter === other.twitter &&
			this.github === other.github &&
			this.keybase === other.keybase
		);
	}
}
