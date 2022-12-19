import { Organization } from '@stellarbeat/js-stellar-domain';
import OrganizationId from '../../../../domain/OrganizationId';
import OrganizationSnapShot from '../../entities/OrganizationSnapShot';
import PublicKey from '../../../../domain/PublicKey';
import { injectable } from 'inversify';
import { isString } from '../../../../../core/utilities/TypeGuards';

@injectable()
export default class OrganizationSnapShotFactory {
	create(
		organizationId: OrganizationId,
		organization: Organization,
		time: Date,
		validators: PublicKey[]
	) {
		return this.fromOrganization(
			organizationId,
			organization,
			time,
			validators
		);
	}

	createUpdatedSnapShot(
		snapShot: OrganizationSnapShot,
		organization: Organization,
		time: Date,
		validators: PublicKey[]
	) {
		return this.fromOrganization(
			snapShot.organizationIdStorage,
			organization,
			time,
			validators
		);
	}

	protected fromOrganization(
		organizationId: OrganizationId,
		organization: Organization,
		time: Date,
		validators: PublicKey[]
	) {
		const organizationSnapShot = new OrganizationSnapShot(organizationId, time);
		organizationSnapShot.name = organization.name;
		isString(organization.dba)
			? (organizationSnapShot.dba = organization.dba)
			: (organizationSnapShot.dba = null);
		isString(organization.url)
			? (organizationSnapShot.url = organization.url)
			: (organizationSnapShot.url = null);
		isString(organization.officialEmail)
			? (organizationSnapShot.officialEmail = organization.officialEmail)
			: (organizationSnapShot.officialEmail = null);
		isString(organization.phoneNumber)
			? (organizationSnapShot.phoneNumber = organization.phoneNumber)
			: (organizationSnapShot.phoneNumber = null);
		isString(organization.physicalAddress)
			? (organizationSnapShot.physicalAddress = organization.physicalAddress)
			: (organizationSnapShot.physicalAddress = null);
		isString(organization.twitter)
			? (organizationSnapShot.twitter = organization.twitter)
			: (organizationSnapShot.twitter = null);
		isString(organization.github)
			? (organizationSnapShot.github = organization.github)
			: (organizationSnapShot.github = null);
		isString(organization.description)
			? (organizationSnapShot.description = organization.description)
			: (organizationSnapShot.description = null);
		isString(organization.keybase)
			? (organizationSnapShot.keybase = organization.keybase)
			: (organizationSnapShot.keybase = null);
		isString(organization.horizonUrl)
			? (organizationSnapShot.horizonUrl = organization.horizonUrl)
			: (organizationSnapShot.horizonUrl = null);
		organizationSnapShot.validators = validators;

		return organizationSnapShot;
	}
}
