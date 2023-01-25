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

@injectable()
export default class OrganizationSnapShotFactory {
	create(
		organization: Organization,
		organizationDTO: OrganizationDTO,
		time: Date
	) {
		return this.fromOrganizationDTO(organization, organizationDTO, time);
	}

	createUpdatedSnapShot(
		snapShot: OrganizationSnapShot,
		organizationDTO: OrganizationDTO,
		time: Date
	) {
		return this.fromOrganizationDTO(
			snapShot.organization,
			organizationDTO,
			time
		);
	}

	protected fromOrganizationDTO(
		organization: Organization,
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

		const organizationSnapShot = new OrganizationSnapShot(
			time,
			validators,
			OrganizationContactInformation.create(contactProps)
		);
		organizationSnapShot.organization = organization;
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
