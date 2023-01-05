import { Network } from '@stellarbeat/js-stellar-domain';
import { inject, injectable } from 'inversify';
import { Result } from 'neverthrow';
import { GetNetworkDTO } from './GetNetworkDTO';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { NetworkReadRepository } from '../../domain/NetworkReadRepository';

@injectable()
export class GetNetwork {
	constructor(
		@inject(NETWORK_TYPES.NetworkReadRepository)
		private readonly networkRepository: NetworkReadRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: GetNetworkDTO): Promise<Result<Network | null, Error>> {
		const networkOrError = await this.networkRepository.getNetwork(dto.at);

		if (networkOrError.isErr()) {
			this.exceptionLogger.captureException(networkOrError.error);
		}

		return networkOrError;
	}
}
