import { hasNoActiveTrustingNodes } from '../hasNoActiveTrustingNodes';
import { Edge, TrustGraph, Vertex } from '@stellarbeat/js-stellarbeat-shared';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { createDummyNode } from '../../__fixtures__/createDummyNode';

describe('hasNoActiveTrustingNodes', () => {
	const nodesTrustGraph = new TrustGraph(
		new StronglyConnectedComponentsFinder(),
		new NetworkTransitiveQuorumSetFinder()
	);

	const nodeA = createDummyNode();
	const vertexA = new Vertex(nodeA.publicKey.value, 'A', 0);
	const nodeB = createDummyNode();
	const vertexB = new Vertex(nodeB.publicKey.value, 'B', 0);
	const nodeC = createDummyNode();
	const vertexC = new Vertex(nodeC.publicKey.value, 'C', 0);
	nodesTrustGraph.addVertex(vertexA);
	nodesTrustGraph.addVertex(vertexB);
	nodesTrustGraph.addVertex(vertexC);

	nodesTrustGraph.addEdge(new Edge(vertexA, vertexB));
	nodesTrustGraph.addEdge(new Edge(vertexB, vertexA));

	test('has no trusting nodes', () => {
		expect(hasNoActiveTrustingNodes(nodeA, [], nodesTrustGraph)).toBe(false);
		expect(hasNoActiveTrustingNodes(nodeB, [], nodesTrustGraph)).toBe(false);
		expect(hasNoActiveTrustingNodes(nodeC, [], nodesTrustGraph)).toBe(true);
	});

	test('has no active trusting nodes', () => {
		expect(
			hasNoActiveTrustingNodes(nodeA, [nodeB.publicKey.value], nodesTrustGraph)
		).toBe(true);
		expect(
			hasNoActiveTrustingNodes(nodeB, [nodeA.publicKey.value], nodesTrustGraph)
		).toBe(true);
	});
});
