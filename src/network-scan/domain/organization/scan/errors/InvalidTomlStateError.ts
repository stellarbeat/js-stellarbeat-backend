import { OrganizationScanError } from './OrganizationScanError';
import { TomlState } from '../TomlState';

export class InvalidTomlStateError extends OrganizationScanError {
	constructor(homeDomain: string, tomlState: TomlState) {
		super(
			`Organization toml file for home-domain ${homeDomain} has invalid state ${TomlState[tomlState]}`,
			InvalidTomlStateError.name
		);
	}
}
