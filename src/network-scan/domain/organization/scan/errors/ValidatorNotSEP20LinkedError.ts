import { CustomError } from '../../../../../core/errors/CustomError';
import PublicKey from '../../../node/PublicKey';
import { OrganizationScanError } from './OrganizationScanError';

export class ValidatorNotSEP20LinkedError extends OrganizationScanError {
	constructor(
		organizationHomeDomain: string,
		validatorHomeDomain: string | null,
		validator: PublicKey
	) {
		super(
			`Cannot add validator ${validator} with home-domain ${validatorHomeDomain}
			 to organization with home-domain ${organizationHomeDomain} because it is not linked to the organization
			 through SEP-0020`,
			ValidatorNotSEP20LinkedError.name
		);
	}
}
