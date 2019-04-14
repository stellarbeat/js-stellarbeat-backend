import { Node } from "@stellarbeat/js-stellar-domain";
export declare class NodeRepository {
    findAllNodes(): Promise<Node[]>;
    findByPublicKey(publicKey: string): Promise<Node | null>;
    updateOrCreateNodes(nodes: Array<Node>): Promise<void>;
    addNode(node: Node): Promise<void>;
    updateNode(node: Node): Promise<void>;
    destroyConnection(): Promise<void>;
}
