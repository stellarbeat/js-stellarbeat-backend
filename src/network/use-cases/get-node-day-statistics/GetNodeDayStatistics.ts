import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import NodeMeasurementV2 from '../../infrastructure/database/entities/NodeMeasurementV2';
import NodeMeasurementService from '../../infrastructure/database/repositories/NodeMeasurementService';
import { GetNodeDayStatisticsDTO } from './GetNodeDayStatisticsDTO';
import NodeMeasurementDayV2 from '../../infrastructure/database/entities/NodeMeasurementDayV2';
import { NodeMeasurementV2Statistics } from '../../infrastructure/database/repositories/NodeMeasurementDayV2Repository';

@injectable()
export class GetNodeDayStatistics {
	constructor(
		private measurementService: NodeMeasurementService,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNodeDayStatisticsDTO
	): Promise<Result<NodeMeasurementV2Statistics[], Error>> {
		try {
			return ok(
				await this.measurementService.getNodeDayMeasurements(
					dto.publicKey,
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
