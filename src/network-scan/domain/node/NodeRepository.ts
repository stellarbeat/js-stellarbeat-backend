import PublicKey from './PublicKey';
import Node from './Node';

export interface NodeRepository {
	save(nodes: Node[], from: Date): Promise<Node[]>;
	findActive(at: Date): Promise<Node[]>;
	findLatestActive(): Promise<Node[]>;
	findLatestActiveByPublicKey(publicKeys: string[]): Promise<Node[]>;
	findActiveByPublicKey(
		publicKey: PublicKey,
		at: Date
	): Promise<Node | undefined>;
	findByPublicKey(publicKeys: PublicKey[]): Promise<Node[]>;
	findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined>;
}
