import { TrackedEntityId } from './TrackedEntityId';

//we want to be able to track different partitions in a network. For example different forks in the stellar public network
//when we implement this feature, NetworkId should become NetworkPartitionId
export class NetworkId implements TrackedEntityId {
	constructor(public readonly value: string) {}
}
