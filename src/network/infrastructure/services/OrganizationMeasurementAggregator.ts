import { inject, injectable } from 'inversify';
import { VersionedOrganizationRepository } from '../../domain/VersionedOrganization';
import { OrganizationMeasurementDayRepository } from '../../domain/measurement-aggregation/OrganizationMeasurementDayRepository';
import { NETWORK_TYPES } from '../di/di-types';
import 'reflect-metadata';

@injectable()
export default class OrganizationMeasurementAggregator {
	constructor(
		@inject(NETWORK_TYPES.VersionedOrganizationRepository)
		public organizationRepository: VersionedOrganizationRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		public organizationMeasurementDayRepository: OrganizationMeasurementDayRepository
	) {}

	async getOrganizationDayMeasurements(
		organizationId: string,
		from: Date,
		to: Date
	) {
		const versionedOrganization = await this.organizationRepository.findOne({
			where: {
				organizationId: organizationId
			}
		});

		if (!versionedOrganization) {
			return [];
		}

		return await this.organizationMeasurementDayRepository.findBetween(
			versionedOrganization,
			from,
			to
		);
	}
}
