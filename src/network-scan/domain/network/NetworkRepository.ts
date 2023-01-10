import { Network } from './Network';
import { NetworkId } from './NetworkId';

export interface NetworkRepository {
	save(networks: Network): Promise<Network>;
	save(networks: Network[]): Promise<Network[]>;
	findOneByNetworkId(
		networkId: NetworkId
	): Promise<Network | undefined>;
}
