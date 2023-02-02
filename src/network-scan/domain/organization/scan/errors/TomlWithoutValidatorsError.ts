import { CustomError } from '../../../../../core/errors/CustomError';
import { OrganizationScanError } from './OrganizationScanError';

export class TomlWithoutValidatorsError extends OrganizationScanError {
	constructor(homeDomain: string) {
		super(
			`Organization toml file for home-domain ${homeDomain} does not have any validators`,
			TomlWithoutValidatorsError.name
		);
	}
}
