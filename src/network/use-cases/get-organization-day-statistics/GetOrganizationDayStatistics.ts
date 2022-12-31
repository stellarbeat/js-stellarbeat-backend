import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetOrganizationDayStatisticsDTO } from './GetOrganizationDayStatisticsDTO';
import OrganizationMeasurementDay from '../../domain/measurement-aggregation/OrganizationMeasurementDay';
import { OrganizationMeasurementDayRepository } from '../../domain/measurement-aggregation/OrganizationMeasurementDayRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import 'reflect-metadata';
import { OrganizationId } from '../../domain/OrganizationId';

@injectable()
export class GetOrganizationDayStatistics {
	constructor(
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		private organizationMeasurementDayRepository: OrganizationMeasurementDayRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetOrganizationDayStatisticsDTO
	): Promise<Result<OrganizationMeasurementDay[], Error>> {
		try {
			const organizationIdOrError = OrganizationId.create(dto.organizationId);
			if (organizationIdOrError.isErr()) {
				return err(organizationIdOrError.error);
			}
			return ok(
				await this.organizationMeasurementDayRepository.findBetween(
					organizationIdOrError.value,
					dto.from,
					dto.to
				)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
