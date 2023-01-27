import { ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { OrganizationTomlFetcher } from './OrganizationTomlFetcher';
import { OrganizationScan } from './OrganizationScan';
import { NodeScan } from '../../node/scan/NodeScan';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { OrganizationRepository } from '../OrganizationRepository';
import Organization from '../Organization';

@injectable()
export class OrganizationScanner {
	constructor(
		private organizationTomlFetcher: OrganizationTomlFetcher,
		@inject(NETWORK_TYPES.OrganizationRepository)
		private organizationRepository: OrganizationRepository
	) {}

	public async execute(
		organizationScan: OrganizationScan,
		nodeScan: NodeScan
	): Promise<Result<OrganizationScan, Error>> {
		const organizationTomlInfoCollection =
			await this.organizationTomlFetcher.fetchOrganizationTomlInfoCollection(
				nodeScan.getHomeDomains()
			);

		const archivedOrganizations = await this.getArchivedOrganizations(
			organizationScan.organizations,
			nodeScan.getHomeDomains()
		);

		organizationScan.updateWithTomlInfoCollection(
			organizationTomlInfoCollection,
			nodeScan,
			archivedOrganizations
		);

		//organizationScan.calculateOrganizationAvailability(nodeScan);

		return ok(organizationScan);
	}

	private async getArchivedOrganizations(
		activeOrganizations: Organization[],
		detectedHomeDomains: string[]
	): Promise<Organization[]> {
		const archivedHomeDomains = detectedHomeDomains.filter(
			(homeDomain) =>
				!activeOrganizations.find(
					(organization) => organization.homeDomain === homeDomain
				)
		);

		if (archivedHomeDomains.length > 0)
			return await this.organizationRepository.findByHomeDomains(
				archivedHomeDomains
			);

		return [];
	}
}
