import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';
import Node from '../Node';

export function hasNoActiveTrustingNodes(
	node: Node,
	inactiveNodes: string[],
	nodesTrustGraph: TrustGraph
): boolean {
	const vertex = nodesTrustGraph.getVertex(node.publicKey.value);
	if (!vertex) {
		return true; //no trust links, e.g. watcher
	}
	const trustingNodes = nodesTrustGraph.getParents(vertex);

	const activeTrustingNodes = Array.from(trustingNodes).filter(
		(trustingNode) => !inactiveNodes.includes(trustingNode.key)
	);

	return activeTrustingNodes.length === 0;
}
