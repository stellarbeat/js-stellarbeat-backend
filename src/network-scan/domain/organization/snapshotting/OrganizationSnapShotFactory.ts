import { Organization as OrganizationDTO } from '@stellarbeat/js-stellarbeat-shared';
import Organization from '../Organization';
import OrganizationSnapShot from '../OrganizationSnapShot';
import { injectable } from 'inversify';
import { isString } from '../../../../core/utilities/TypeGuards';
import PublicKey from '../../node/PublicKey';
import {
	OrganizationContactInformation,
	OrganizationContactInformationProps
} from '../OrganizationContactInformation';
import { OrganizationValidators } from '../OrganizationValidators';
import { OrganizationId } from '../OrganizationId';

@injectable()
export default class OrganizationSnapShotFactory {
	create(
		organizationId: OrganizationId,
		organizationDTO: OrganizationDTO,
		homeDomain: string,
		time: Date
	) {
		const organization = Organization.create(organizationId, homeDomain, time);

		organization.currentSnapshot().validators = new OrganizationValidators(
			organizationDTO.validators
				.map((validator) => PublicKey.create(validator))
				.map((publicKeyOrError) => {
					if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
					return publicKeyOrError.value;
				})
		);

		organization.currentSnapshot().contactInformation =
			OrganizationContactInformation.create({
				officialEmail: organizationDTO.officialEmail,
				phoneNumber: organizationDTO.phoneNumber,
				physicalAddress: organizationDTO.physicalAddress,
				twitter: organizationDTO.twitter,
				github: organizationDTO.github,
				keybase: organizationDTO.keybase,
				dba: organizationDTO.dba
			});

		return this.fromOrganizationDTO(
			organization.currentSnapshot(),
			organizationDTO
		);
	}

	createUpdatedSnapShot(
		snapShot: OrganizationSnapShot,
		organizationDTO: OrganizationDTO,
		time: Date
	) {
		const validators = new OrganizationValidators(
			organizationDTO.validators
				.map((validator) => PublicKey.create(validator))
				.map((publicKeyOrError) => {
					if (publicKeyOrError.isErr()) throw publicKeyOrError.error;
					return publicKeyOrError.value;
				})
		);

		const contactProps: OrganizationContactInformationProps = {
			officialEmail: organizationDTO.officialEmail,
			phoneNumber: organizationDTO.phoneNumber,
			physicalAddress: organizationDTO.physicalAddress,
			twitter: organizationDTO.twitter,
			github: organizationDTO.github,
			keybase: organizationDTO.keybase,
			dba: organizationDTO.dba
		};

		const newSnapshot = new OrganizationSnapShot(
			time,
			validators,
			OrganizationContactInformation.create(contactProps)
		);
		newSnapshot.organization = snapShot.organization;

		return this.fromOrganizationDTO(newSnapshot, organizationDTO);
	}

	protected fromOrganizationDTO(
		organizationSnapShot: OrganizationSnapShot,
		organizationDTO: OrganizationDTO
	) {
		organizationSnapShot.name = organizationDTO.name;
		isString(organizationDTO.dba)
			? (organizationSnapShot.contactInformation.dba = organizationDTO.dba)
			: (organizationSnapShot.contactInformation.dba = null);
		isString(organizationDTO.url)
			? (organizationSnapShot.url = organizationDTO.url)
			: (organizationSnapShot.url = null);

		isString(organizationDTO.description)
			? (organizationSnapShot.description = organizationDTO.description)
			: (organizationSnapShot.description = null);

		isString(organizationDTO.horizonUrl)
			? (organizationSnapShot.horizonUrl = organizationDTO.horizonUrl)
			: (organizationSnapShot.horizonUrl = null);

		return organizationSnapShot;
	}
}
