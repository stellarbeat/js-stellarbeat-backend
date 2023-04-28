import PublicKey from './PublicKey';
import Node from './Node';

//active means that the node is not archived. i.e. snapshot endDate = SNAPSHOT_MAX_END_DATE
export interface NodeRepository {
	save(nodes: Node[], from: Date): Promise<Node[]>;
	findActiveAtTimePoint(at: Date): Promise<Node[]>;
	findActive(): Promise<Node[]>;
	findActiveByPublicKey(publicKeys: string[]): Promise<Node[]>;
	findActiveByPublicKeyAtTimePoint(
		publicKey: PublicKey,
		at: Date
	): Promise<Node | undefined>;
	findByPublicKey(publicKeys: PublicKey[]): Promise<Node[]>; //active or not
	findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined>; //active or not
}
