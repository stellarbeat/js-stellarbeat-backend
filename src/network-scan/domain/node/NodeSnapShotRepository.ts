import NodeSnapShot from './NodeSnapShot';
import PublicKey from './PublicKey';

//todo: this repo should be removed when we start storing changes
export interface NodeSnapShotRepository {
	//todo: NodeId should not be used in domain
	findActiveByNodeId(nodeIds: number[]): Promise<NodeSnapShot[]>;

	archiveInActiveWithMultipleIpSamePort(time: Date): Promise<void>;

	findLatest(at: Date): Promise<NodeSnapShot[]>;
	findLatestByPublicKey(
		publicKey: PublicKey,
		at: Date
	): Promise<NodeSnapShot[]>;

	save(nodeSnapShots: NodeSnapShot[]): Promise<NodeSnapShot[]>;
}
