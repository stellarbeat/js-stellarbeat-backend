import { SnapShotRepository } from '../../infrastructure/database/repositories/OrganizationSnapShotRepository';
import NodeSnapShot, { SnapShot } from '../NodeSnapShot';
import VersionedNode from '../VersionedNode';

export interface NodeSnapShotRepository extends SnapShotRepository {
	findActive(): Promise<NodeSnapShot[]>;

	findActiveAtTime(time: Date): Promise<NodeSnapShot[]>;

	findActiveByNodeId(nodeIds: number[]): Promise<NodeSnapShot[]>;

	archiveInActiveWithMultipleIpSamePort(time: Date): Promise<void>;

	findLatestByNode(node: VersionedNode, at: Date): Promise<NodeSnapShot[]>;

	findLatest(at: Date): Promise<NodeSnapShot[]>;

	save(nodeSnapShot: NodeSnapShot[]): Promise<NodeSnapShot[]>;
}
