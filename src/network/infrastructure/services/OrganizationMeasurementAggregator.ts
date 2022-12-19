import { inject, injectable } from 'inversify';
import { OrganizationIdRepository } from '../../domain/OrganizationId';
import { OrganizationMeasurementDayRepository } from '../database/repositories/OrganizationMeasurementDayRepository';

@injectable()
export default class OrganizationMeasurementAggregator {
	constructor(
		@inject('OrganizationIdStorageRepository')
		public organizationIdStorageRepository: OrganizationIdRepository,
		public organizationMeasurementDayRepository: OrganizationMeasurementDayRepository
	) {}

	async getOrganizationDayMeasurements(
		organizationId: string,
		from: Date,
		to: Date
	) {
		const organizationIdStorage =
			await this.organizationIdStorageRepository.findOne({
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
