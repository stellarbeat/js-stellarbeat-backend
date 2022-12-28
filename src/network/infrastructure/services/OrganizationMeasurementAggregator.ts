import { inject, injectable } from 'inversify';
import { VersionedOrganizationRepository } from '../../domain/VersionedOrganization';
import { OrganizationMeasurementDayRepository } from '../../domain/measurement/OrganizationMeasurementDayRepository';
import { NETWORK_TYPES } from '../di/di-types';
import 'reflect-metadata';

@injectable()
export default class OrganizationMeasurementAggregator {
	constructor(
		@inject('OrganizationIdStorageRepository')
		public organizationRepository: VersionedOrganizationRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		public organizationMeasurementDayRepository: OrganizationMeasurementDayRepository
	) {}

	async getOrganizationDayMeasurements(
		organizationId: string,
		from: Date,
		to: Date
	) {
		const organizationIdStorage = await this.organizationRepository.findOne({
			where: {
				organizationId: organizationId
			}
		});

		if (!organizationIdStorage) {
			return [];
		}

		return await this.organizationMeasurementDayRepository.findBetween(
			organizationIdStorage,
			from,
			to
		);
	}
}
