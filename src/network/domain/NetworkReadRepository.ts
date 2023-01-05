import { Result } from 'neverthrow';
import { Network } from '@stellarbeat/js-stellar-domain/lib/network';

export interface NetworkReadRepository {
	getNetwork(time?: Date): Promise<Result<Network | null, Error>>;
	getPreviousNetwork(
		currentNetworkTime: Date
	): Promise<Result<Network | null, Error>>;
}
