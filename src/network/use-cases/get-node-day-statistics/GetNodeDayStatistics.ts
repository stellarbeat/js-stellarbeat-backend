import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetNodeDayStatisticsDTO } from './GetNodeDayStatisticsDTO';
import { NodeMeasurementV2Statistics } from '../../infrastructure/database/repositories/TypeOrmNodeMeasurementDayRepository';
import NodeMeasurementAggregator from '../../infrastructure/services/NodeMeasurementAggregator';
import PublicKey from '../../domain/PublicKey';

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
			const publicKeyOrError = PublicKey.create(dto.publicKey);
			if (publicKeyOrError.isErr()) {
				return err(publicKeyOrError.error);
			}
			return ok(
				await this.measurementAggregationService.getNodeDayMeasurements(
					publicKeyOrError.value,
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
