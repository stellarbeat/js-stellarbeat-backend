import PublicKey from './PublicKey';
import Node from './Node';

export interface NodeRepository {
	save(nodes: Node[]): Promise<Node[]>;
	findActive(): Promise<Node[]>;
	findActiveByPublicKey(publicKey: PublicKey): Promise<Node | undefined>;
	findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined>;
}
