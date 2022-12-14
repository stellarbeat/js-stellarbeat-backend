import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetOrganizationStatisticsDTO } from './GetOrganizationStatisticsDTO';
import OrganizationMeasurementService from '../../infrastructure/services/OrganizationMeasurementService';
import OrganizationMeasurement from '../../infrastructure/database/entities/OrganizationMeasurement';

@injectable()
export class GetOrganizationStatistics {
	constructor(
		private measurementService: OrganizationMeasurementService,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetOrganizationStatisticsDTO
	): Promise<Result<OrganizationMeasurement[], Error>> {
		try {
			return ok(
				await this.measurementService.getOrganizationMeasurements(
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
