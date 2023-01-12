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
		const organizationSnapShot = new OrganizationSnapShot(organization, time);
		organizationSnapShot.name = organizationDTO.name;
		isString(organizationDTO.dba)
			? (organizationSnapShot.dba = organizationDTO.dba)
			: (organizationSnapShot.dba = null);
		isString(organizationDTO.url)
			? (organizationSnapShot.url = organizationDTO.url)
			: (organizationSnapShot.url = null);
		isString(organizationDTO.officialEmail)
			? (organizationSnapShot.officialEmail = organizationDTO.officialEmail)
			: (organizationSnapShot.officialEmail = null);
		isString(organizationDTO.phoneNumber)
			? (organizationSnapShot.phoneNumber = organizationDTO.phoneNumber)
			: (organizationSnapShot.phoneNumber = null);
		isString(organizationDTO.physicalAddress)
			? (organizationSnapShot.physicalAddress = organizationDTO.physicalAddress)
			: (organizationSnapShot.physicalAddress = null);
		isString(organizationDTO.twitter)
			? (organizationSnapShot.twitter = organizationDTO.twitter)
			: (organizationSnapShot.twitter = null);
		isString(organizationDTO.github)
			? (organizationSnapShot.github = organizationDTO.github)
			: (organizationSnapShot.github = null);
		isString(organizationDTO.description)
			? (organizationSnapShot.description = organizationDTO.description)
			: (organizationSnapShot.description = null);
		isString(organizationDTO.keybase)
			? (organizationSnapShot.keybase = organizationDTO.keybase)
			: (organizationSnapShot.keybase = null);
		isString(organizationDTO.horizonUrl)
			? (organizationSnapShot.horizonUrl = organizationDTO.horizonUrl)
			: (organizationSnapShot.horizonUrl = null);
		organizationSnapShot.validators = validators;

		return organizationSnapShot;
	}
}
