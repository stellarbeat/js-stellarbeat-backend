import { GetMeasurementsDTO } from './GetMeasurementsDTO';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { MeasurementRepository } from '../../infrastructure/database/repositories/MeasurementRepository';
import { Measurement } from '../../infrastructure/database/entities/OrganizationMeasurement';

export class GetMeasurements {
	constructor(
		private measurementRepository: MeasurementRepository,
		private exceptionLogger: ExceptionLogger
	) {}

	public async execute(
		dto: GetMeasurementsDTO
	): Promise<Result<Measurement[], Error>> {
		try {
			return ok(
				await this.measurementRepository.findBetween(dto.id, dto.from, dto.to)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
