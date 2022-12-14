import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetOrganizationDayStatisticsDTO } from './GetOrganizationDayStatisticsDTO';
import OrganizationMeasurement from '../../infrastructure/database/entities/OrganizationMeasurement';
import OrganizationMeasurementAggregator from '../../infrastructure/services/OrganizationMeasurementAggregator';

@injectable()
export class GetOrganizationDayStatistics {
	constructor(
		private measurementAggregationService: OrganizationMeasurementAggregator,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetOrganizationDayStatisticsDTO
	): Promise<Result<OrganizationMeasurement[], Error>> {
		try {
			return ok(
				await this.measurementAggregationService.getOrganizationDayMeasurements(
					dto.organizationId,
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
