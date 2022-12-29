import { TypeOrmNetworkMeasurementMonthRepository } from '../../infrastructure/database/repositories/TypeOrmNetworkMeasurementMonthRepository';
import { GetNetworkMonthStatisticsDTO } from './GetNetworkMonthStatisticsDTO';
import NetworkMeasurementMonth from '../../domain/NetworkMeasurementMonth';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import 'reflect-metadata';

@injectable()
export class GetNetworkMonthStatistics {
	constructor(
		@inject(NETWORK_TYPES.NetworkMeasurementMonthRepository)
		private repo: TypeOrmNetworkMeasurementMonthRepository,
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
