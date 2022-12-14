import { inject, injectable } from 'inversify';
import { Between } from 'typeorm';
import { OrganizationIdStorageRepository } from '../database/entities/OrganizationIdStorage';
import { OrganizationMeasurementRepository } from '../database/repositories/OrganizationMeasurementRepository';
import OrganizationMeasurement from '../database/entities/OrganizationMeasurement';

@injectable()
export default class OrganizationMeasurementService {
	constructor(
		@inject('OrganizationIdStorageRepository')
		private organizationIdStorageRepository: OrganizationIdStorageRepository,
		private organizationMeasurementRepository: OrganizationMeasurementRepository
	) {}

	async getOrganizationMeasurements(
		organizationId: string,
		from: Date,
		to: Date
	): Promise<OrganizationMeasurement[]> {
		const organizationIdStorage =
			await this.organizationIdStorageRepository.findOne({
				where: {
					organizationId: organizationId
				}
			});

		if (!organizationIdStorage) {
			return [];
		}

		return await this.organizationMeasurementRepository.find({
			where: [
				{
					organizationIdStorage: organizationIdStorage,
					time: Between(from, to)
				}
			],
			order: { time: 'ASC' }
		});
	}
}
