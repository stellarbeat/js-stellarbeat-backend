import { Result } from 'neverthrow';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared/lib/network';

export interface NetworkReadRepository {
	getNetwork(time?: Date): Promise<Result<NetworkDTO | null, Error>>;
	getPreviousNetwork(
		currentNetworkTime: Date
	): Promise<Result<NetworkDTO | null, Error>>;
}
