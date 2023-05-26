import {
	Edge,
	QuorumSet,
	TrustGraph,
	Vertex
} from '@stellarbeat/js-stellarbeat-shared';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import Node from '../Node';

export class TrustGraphFactory {
	static create(nodes: Node[]): TrustGraph {
		const trustGraph = new TrustGraph(
			new StronglyConnectedComponentsFinder(),
			new NetworkTransitiveQuorumSetFinder()
		);
		if (nodes.length === 0) {
			trustGraph.updateStronglyConnectedComponentsAndNetworkTransitiveQuorumSet();
			return trustGraph;
		}

		const vertices: Map<string, Vertex> = new Map(
			nodes.map((node) => {
				return [
					node.publicKey.value,
					new Vertex(node.publicKey.value, node.publicKey.value, 1)
				];
			})
		);

		vertices.forEach((vertex) => trustGraph.addVertex(vertex));

		nodes.forEach((node) => {
			if (node.quorumSet) {
				QuorumSet.getAllValidators(node.quorumSet.quorumSet).forEach(
					(validator) => {
						const left = vertices.get(node.publicKey.value);
						const right = vertices.get(validator);
						if (left && right) {
							trustGraph.addEdge(new Edge(left, right));
						}
					}
				);
			}
		});
		trustGraph.updateStronglyConnectedComponentsAndNetworkTransitiveQuorumSet();

		return trustGraph;
	}
}
