import { Network } from './Network';
import { NetworkId } from './NetworkId';

export interface NetworkRepository {
	save(network: Network): Promise<Network>;
	findActiveByNetworkId(networkId: NetworkId): Promise<Network | null>;
	findAtDateByNetworkId(
		networkId: NetworkId,
		at: Date
	): Promise<Network | null>;
	findPassphraseByNetworkId(networkId: NetworkId): Promise<string | undefined>;
}
