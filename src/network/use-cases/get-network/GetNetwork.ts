import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { inject, injectable } from 'inversify';
import { Result } from 'neverthrow';
import { GetNetworkDTO } from './GetNetworkDTO';
import { CORE_TYPES } from '../../../core/infrastructure/di/di-types';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';

@injectable()
export class GetNetwork {
	constructor(
		@inject(CORE_TYPES.NetworkReadRepository)
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
