import { inject, injectable } from 'inversify';
import { Between } from 'typeorm';
import { OrganizationIdStorageRepository } from '../storage/entities/OrganizationIdStorage';
import { OrganizationMeasurementRepository } from '../storage/repositories/OrganizationMeasurementRepository';
import { OrganizationMeasurementDayRepository } from '../storage/repositories/OrganizationMeasurementDayRepository';

@injectable()
export default class OrganizationMeasurementService {
	protected organizationIdStorageRepository: OrganizationIdStorageRepository;
	protected organizationMeasurementRepository: OrganizationMeasurementRepository;
	protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;

	constructor(
		@inject('OrganizationIdStorageRepository')
		organizationIdStorageRepository: OrganizationIdStorageRepository,
		organizationMeasurementRepository: OrganizationMeasurementRepository,
		organizationMeasurementDayRepository: OrganizationMeasurementDayRepository
	) {
		this.organizationIdStorageRepository = organizationIdStorageRepository;
		this.organizationMeasurementRepository = organizationMeasurementRepository;
		this.organizationMeasurementDayRepository =
			organizationMeasurementDayRepository;
	}

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

	async getOrganizationMeasurements(
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
