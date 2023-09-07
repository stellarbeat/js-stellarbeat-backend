import { TomlState } from './TomlState';

export interface OrganizationTomlInfo {
	state: TomlState;
	name: string | null;
	physicalAddress: string | null;
	twitter: string | null;
	github: string | null;
	keybase: string | null;
	officialEmail: string | null;
	horizonUrl: string | null;
	dba: string | null;
	url: string | null;
	description: string | null;
	phoneNumber: string | null;
	validators: string[];
}
