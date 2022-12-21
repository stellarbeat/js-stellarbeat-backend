import { VersionedNetwork } from './VersionedNetwork';

export interface VersionedNetworkRepository {
	save(networks: VersionedNetwork[]): Promise<VersionedNetwork[]>;
}
