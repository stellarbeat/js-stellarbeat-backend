import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetNetworkDayStatisticsDTO } from './GetNetworkDayStatisticsDTO';
import NetworkMeasurementDay from '../../domain/measurement-aggregation/NetworkMeasurementDay';
import { NetworkMeasurementDayRepository } from '../../domain/measurement-aggregation/NetworkMeasurementDayRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import 'reflect-metadata';
import { NetworkId } from '../../domain/NetworkId';

@injectable()
export class GetNetworkDayStatistics {
	constructor(
		@inject(NETWORK_TYPES.NetworkMeasurementDayRepository)
		private repo: NetworkMeasurementDayRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNetworkDayStatisticsDTO
	): Promise<Result<NetworkMeasurementDay[], Error>> {
		try {
			return ok(
				await this.repo.findBetween(new NetworkId('public'), dto.from, dto.to)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
