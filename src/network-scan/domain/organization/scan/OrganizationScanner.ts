import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { OrganizationTomlFetcher } from './OrganizationTomlFetcher';
import { OrganizationScan } from './OrganizationScan';
import { NodeScan } from '../../node/scan/NodeScan';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { OrganizationRepository } from '../OrganizationRepository';
import Organization from '../Organization';
import { mapUnknownToError } from '../../../../core/utilities/mapUnknownToError';
import { CouldNotRetrieveArchivedOrganizationsError } from './errors/CouldNotRetrieveArchivedOrganizationsError';
import { OrganizationScanError } from './errors/OrganizationScanError';
import { Logger } from '../../../../core/services/PinoLogger';

@injectable()
export class OrganizationScanner {
	constructor(
		private organizationTomlFetcher: OrganizationTomlFetcher,
		@inject(NETWORK_TYPES.OrganizationRepository)
		private organizationRepository: OrganizationRepository,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(
		organizationScan: OrganizationScan,
		nodeScan: NodeScan
	): Promise<Result<OrganizationScan, OrganizationScanError>> {
		const organizationTomlInfoCollection =
			await this.organizationTomlFetcher.fetchOrganizationTomlInfoCollection(
				nodeScan.getHomeDomains()
			);

		const archivedOrganizationsOrError = await this.getArchivedOrganizations(
			organizationScan.organizations,
			nodeScan.getHomeDomains()
		);
		if (archivedOrganizationsOrError.isErr())
			return err(archivedOrganizationsOrError.error);

		const updateResult = organizationScan.updateWithTomlInfoCollection(
			organizationTomlInfoCollection,
			nodeScan,
			archivedOrganizationsOrError.value
		);

		if (updateResult.isErr()) return err(updateResult.error);
		updateResult.value.forEach((invalidOrganizationTomlInfo) => {
			this.logger.info('Invalid organization toml info', {
				homeDomain: invalidOrganizationTomlInfo.homeDomain,
				errorType: invalidOrganizationTomlInfo.error.name,
				errorMessage: invalidOrganizationTomlInfo.error.message
			});
		});

		organizationScan.calculateOrganizationAvailability(nodeScan);

		const archiveOrganizations =
			organizationScan.archiveOrganizationsWithNoActiveValidators(nodeScan);
		archiveOrganizations.forEach((organization) => {
			this.logger.info('Archived organization', {
				homeDomain: organization.homeDomain
			});
		});

		return ok(organizationScan);
	}

	private async getArchivedOrganizations(
		activeOrganizations: Organization[],
		detectedHomeDomains: string[]
	): Promise<Result<Organization[], OrganizationScanError>> {
		try {
			const archivedHomeDomains = detectedHomeDomains.filter(
				(homeDomain) =>
					!activeOrganizations.find(
						(organization) => organization.homeDomain === homeDomain
					)
			);

			if (archivedHomeDomains.length > 0)
				return ok(
					await this.organizationRepository.findByHomeDomains(
						archivedHomeDomains
					)
				);

			return ok([]);
		} catch (e) {
			return err(
				new CouldNotRetrieveArchivedOrganizationsError(mapUnknownToError(e))
			);
		}
	}
}
