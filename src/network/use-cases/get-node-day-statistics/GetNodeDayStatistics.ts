import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetNodeDayStatisticsDTO } from './GetNodeDayStatisticsDTO';
import { NodeMeasurementV2Statistics } from '../../infrastructure/database/repositories/NodeMeasurementDayV2Repository';
import NodeMeasurementAggregator from '../../infrastructure/services/NodeMeasurementAggregator';

@injectable()
export class GetNodeDayStatistics {
	constructor(
		private measurementAggregationService: NodeMeasurementAggregator,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNodeDayStatisticsDTO
	): Promise<Result<NodeMeasurementV2Statistics[], Error>> {
		try {
			return ok(
				await this.measurementAggregationService.getNodeDayMeasurements(
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
