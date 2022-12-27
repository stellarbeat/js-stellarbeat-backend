import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { NetworkMeasurementDayRepository } from '../../infrastructure/database/repositories/NetworkMeasurementDayRepository';
import { GetNetworkDayStatisticsDTO } from './GetNetworkDayStatisticsDTO';
import NetworkMeasurementDay from '../../domain/NetworkMeasurementDay';

@injectable()
export class GetNetworkDayStatistics {
	constructor(
		private repo: NetworkMeasurementDayRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNetworkDayStatisticsDTO
	): Promise<Result<NetworkMeasurementDay[], Error>> {
		try {
			return ok(await this.repo.findBetween(dto.from, dto.to));
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
