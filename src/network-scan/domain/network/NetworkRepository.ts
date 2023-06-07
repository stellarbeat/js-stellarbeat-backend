import { Network } from './Network';
import { NetworkId } from './NetworkId';

export interface NetworkRepository {
	save(network: Network): Promise<Network>;
	findActiveByNetworkId(networkId: NetworkId): Promise<Network | undefined>;
	findAtDateByNetworkId(
		networkId: NetworkId,
		at: Date
	): Promise<Network | undefined>;
	findPassphraseByNetworkId(networkId: NetworkId): Promise<string | undefined>;
}
