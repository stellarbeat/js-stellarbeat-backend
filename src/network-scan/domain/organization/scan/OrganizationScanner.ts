import { TomlService } from '../../network/scan/TomlService';
import {
	Node as NodeDTO,
	Organization
} from '@stellarbeat/js-stellarbeat-shared';
import { ok, Result } from 'neverthrow';
import { OrganizationScanResult } from './OrganizationScanResult';
import { injectable } from 'inversify';

@injectable()
export class OrganizationScanner {
	constructor(private tomlService: TomlService) {}

	public async scan(
		organizations: Organization[],
		nodeDTOs: NodeDTO[]
	): Promise<Result<OrganizationScanResult, Error>> {
		const tomlObjects = await this.tomlService.fetchTomlObjects(
			nodeDTOs
				.filter((node) => node.homeDomain)
				.map((node) => node.homeDomain as string)
		);
		this.tomlService.updateOrganizations(
			Array.from(tomlObjects.values()),
			organizations,
			nodeDTOs
		);

		return ok({
			organizationDTOs: organizations
		});
	}
}
