import { NetworkReadRepository } from './NetworkReadRepository';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';
import { inject, injectable } from 'inversify';
import { Result } from 'neverthrow';
import { Network } from '@stellarbeat/js-stellar-domain/lib/network';

@injectable()
export class NetworkService {
	constructor(
		@inject(NETWORK_TYPES.NetworkReadRepository)
		private networkReadRepository: NetworkReadRepository
	) {}

	getNetwork(time?: Date): Promise<Result<Network | null, Error>> {
		return this.networkReadRepository.getNetwork(time);
	}

	getPreviousNetwork(
		currentNetworkTime: Date
	): Promise<Result<Network | null, Error>> {
		return this.networkReadRepository.getPreviousNetwork(currentNetworkTime);
	}
}
