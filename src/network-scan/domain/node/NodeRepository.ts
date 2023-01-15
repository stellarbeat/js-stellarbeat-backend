import PublicKey from './PublicKey';
import Node from './Node';

export interface NodeRepository {
	save(nodes: Node[]): Promise<Node[]>;
	save(node: Node): Promise<Node>;
	findOneByPublicKey(publicKey: PublicKey): Promise<Node | undefined>;
}
