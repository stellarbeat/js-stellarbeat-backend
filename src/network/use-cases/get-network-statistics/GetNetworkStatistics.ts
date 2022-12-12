import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetNetworkStatisticsDTO } from './GetNetworkStatisticsDTO';
import { NetworkMeasurementRepository } from '../../infrastructure/database/repositories/NetworkMeasurementRepository';
import NetworkMeasurement from '../../infrastructure/database/entities/NetworkMeasurement';

@injectable()
export class GetNetworkStatistics {
	constructor(
		private repo: NetworkMeasurementRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNetworkStatisticsDTO
	): Promise<Result<NetworkMeasurement[], Error>> {
		try {
			return ok(await this.repo.findBetween(dto.from, dto.to));
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
