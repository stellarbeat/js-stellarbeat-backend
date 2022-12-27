import { Organization } from '@stellarbeat/js-stellar-domain';
import VersionedOrganization from '../../VersionedOrganization';
import OrganizationSnapShot from '../../OrganizationSnapShot';
import { injectable } from 'inversify';
import { isString } from '../../../../core/utilities/TypeGuards';
import VersionedNode from '../../VersionedNode';

@injectable()
export default class OrganizationSnapShotFactory {
	create(
		organizationId: VersionedOrganization,
		organization: Organization,
		time: Date,
		validators: VersionedNode[]
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
		validators: VersionedNode[]
	) {
		return this.fromOrganization(
			snapShot.organization,
			organization,
			time,
			validators
		);
	}

	protected fromOrganization(
		organizationId: VersionedOrganization,
		organization: Organization,
		time: Date,
		validators: VersionedNode[]
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
