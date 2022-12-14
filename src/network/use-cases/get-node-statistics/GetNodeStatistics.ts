import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetNodeStatisticsDTO } from './GetNodeStatisticsDTO';
import NodeMeasurementV2 from '../../infrastructure/database/entities/NodeMeasurementV2';
import NodeMeasurementService from '../../infrastructure/database/repositories/NodeMeasurementService';

@injectable()
export class GetNodeStatistics {
	constructor(
		private measurementService: NodeMeasurementService,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNodeStatisticsDTO
	): Promise<Result<NodeMeasurementV2[], Error>> {
		try {
			return ok(
				await this.measurementService.getNodeMeasurements(
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
