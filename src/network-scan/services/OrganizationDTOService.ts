import Organization from '../domain/organization/Organization';
import { err, ok, Result } from 'neverthrow';
import { Organization as OrganizationDTO } from '@stellarbeat/js-stellarbeat-shared/lib/organization';
import { OrganizationMapper } from '../mappers/OrganizationMapper';
import { mapUnknownToError } from '../../core/utilities/mapUnknownToError';
import { OrganizationMeasurementRepository } from '../domain/organization/OrganizationMeasurementRepository';
import { OrganizationMeasurementDayRepository } from '../domain/organization/OrganizationMeasurementDayRepository';
import { inject, injectable } from 'inversify';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';

@injectable()
export class OrganizationDTOService {
	constructor(
		@inject(NETWORK_TYPES.OrganizationMeasurementRepository)
		private organizationMeasurementRepository: OrganizationMeasurementRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		private organizationMeasurementDayRepository: OrganizationMeasurementDayRepository,
		private organizationMapper: OrganizationMapper
	) {}

	public async getOrganizationDTOs(
		time: Date,
		organizations: Organization[]
	): Promise<Result<OrganizationDTO[], Error>> {
		try {
			const measurement24HourAverages =
				await this.organizationMeasurementRepository.findXDaysAverageAt(
					time,
					1
				); //24 hours can be calculated 'live' quickly
			const measurement24HourAveragesMap = new Map(
				measurement24HourAverages.map((avg) => {
					return [avg.organizationId, avg];
				})
			);

			const measurement30DayAverages =
				await this.organizationMeasurementDayRepository.findXDaysAverageAt(
					time,
					30
				);
			const measurement30DayAveragesMap = new Map(
				measurement30DayAverages.map((avg) => {
					return [avg.organizationId, avg];
				})
			);

			return ok(
				organizations.map((organization) => {
					return this.organizationMapper.toOrganizationDTO(
						organization,
						measurement24HourAveragesMap.get(organization.organizationId.value),
						measurement30DayAveragesMap.get(organization.organizationId.value)
					);
				})
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
