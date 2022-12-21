import { VersionedNetwork } from './VersionedNetwork';
import { NetworkId } from './NetworkId';

export interface VersionedNetworkRepository {
	save(networks: VersionedNetwork[]): Promise<VersionedNetwork[]>;
	findOneByNetworkId(
		networkId: NetworkId
	): Promise<VersionedNetwork | undefined>;
}
