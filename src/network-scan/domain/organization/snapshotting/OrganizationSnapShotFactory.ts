import { Organization as OrganizationDTO } from '@stellarbeat/js-stellar-domain';
import Organization from '../Organization';
import OrganizationSnapShot from '../OrganizationSnapShot';
import { injectable } from 'inversify';
import { isString } from '../../../../core/utilities/TypeGuards';
import Node from '../../node/Node';

@injectable()
export default class OrganizationSnapShotFactory {
	create(
		organization: Organization,
		organizationDTO: OrganizationDTO,
		time: Date,
		validators: Node[]
	) {
		return this.fromOrganizationDTO(
			organization,
			organizationDTO,
			time,
			validators
		);
	}

	createUpdatedSnapShot(
		snapShot: OrganizationSnapShot,
		organizationDTO: OrganizationDTO,
		time: Date,
		validators: Node[]
	) {
		return this.fromOrganizationDTO(
			snapShot.organization,
			organizationDTO,
			time,
			validators
		);
	}

	protected fromOrganizationDTO(
		organization: Organization,
		organizationDTO: OrganizationDTO,
		time: Date,
		validators: Node[]
	) {
		const organizationSnapShot = new OrganizationSnapShot(
			organization,
			time,
			validators
		);
		organizationSnapShot.name = organizationDTO.name;
		isString(organizationDTO.dba)
			? (organizationSnapShot.contactInformation.dba = organizationDTO.dba)
			: (organizationSnapShot.contactInformation.dba = null);
		isString(organizationDTO.url)
			? (organizationSnapShot.url = organizationDTO.url)
			: (organizationSnapShot.url = null);
		isString(organizationDTO.officialEmail)
			? (organizationSnapShot.contactInformation.officialEmail =
					organizationDTO.officialEmail)
			: (organizationSnapShot.contactInformation.officialEmail = null);
		isString(organizationDTO.phoneNumber)
			? (organizationSnapShot.contactInformation.phoneNumber =
					organizationDTO.phoneNumber)
			: (organizationSnapShot.contactInformation.phoneNumber = null);
		isString(organizationDTO.physicalAddress)
			? (organizationSnapShot.contactInformation.physicalAddress =
					organizationDTO.physicalAddress)
			: (organizationSnapShot.contactInformation.physicalAddress = null);
		isString(organizationDTO.twitter)
			? (organizationSnapShot.contactInformation.twitter =
					organizationDTO.twitter)
			: (organizationSnapShot.contactInformation.twitter = null);
		isString(organizationDTO.github)
			? (organizationSnapShot.contactInformation.github =
					organizationDTO.github)
			: (organizationSnapShot.contactInformation.github = null);
		isString(organizationDTO.description)
			? (organizationSnapShot.description = organizationDTO.description)
			: (organizationSnapShot.description = null);
		isString(organizationDTO.keybase)
			? (organizationSnapShot.contactInformation.keybase =
					organizationDTO.keybase)
			: (organizationSnapShot.contactInformation.keybase = null);
		isString(organizationDTO.horizonUrl)
			? (organizationSnapShot.horizonUrl = organizationDTO.horizonUrl)
			: (organizationSnapShot.horizonUrl = null);

		return organizationSnapShot;
	}
}
