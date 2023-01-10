import NodeSnapShot from '../NodeSnapShot';
import VersionedNode from '../VersionedNode';
import { SnapShotRepository } from './SnapShotRepository';

export interface NodeSnapShotRepository extends SnapShotRepository {
	findActive(): Promise<NodeSnapShot[]>;

	findActiveAtTime(time: Date): Promise<NodeSnapShot[]>;

	//todo: NodeId should not be used in domain
	findActiveByNodeId(nodeIds: number[]): Promise<NodeSnapShot[]>;

	archiveInActiveWithMultipleIpSamePort(time: Date): Promise<void>;

	findLatestByNode(node: VersionedNode, at: Date): Promise<NodeSnapShot[]>;

	findLatest(at: Date): Promise<NodeSnapShot[]>;

	save(nodeSnapShot: NodeSnapShot[]): Promise<NodeSnapShot[]>;
}
