import { NetworkMeasurementMonthRepository } from '../../infrastructure/database/repositories/NetworkMeasurementMonthRepository';
import { GetNetworkMonthStatisticsDTO } from './GetNetworkMonthStatisticsDTO';
import NetworkMeasurementMonth from '../../infrastructure/database/entities/NetworkMeasurementMonth';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';

@injectable()
export class GetNetworkMonthStatistics {
	constructor(
		private repo: NetworkMeasurementMonthRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNetworkMonthStatisticsDTO
	): Promise<Result<NetworkMeasurementMonth[], Error>> {
		try {
			return ok(await this.repo.findBetween(dto.from, dto.to));
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
