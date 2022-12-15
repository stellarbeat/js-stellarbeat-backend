import { GetMeasurementsDTO } from './GetMeasurementsDTO';
import { Measurement } from '../../infrastructure/database/entities/OrganizationMeasurement';
import { err, ok, Result } from 'neverthrow';
import { MeasurementService } from '../../infrastructure/services/MeasurementService';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';

//dynamically created by factory
export class GetMeasurements<T extends Measurement> {
	constructor(
		private measurementService: MeasurementService<T>,
		private exceptionLogger: ExceptionLogger
	) {}

	public async execute(dto: GetMeasurementsDTO): Promise<Result<T[], Error>> {
		try {
			return ok(
				await this.measurementService.getMeasurements(dto.id, dto.from, dto.to)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
