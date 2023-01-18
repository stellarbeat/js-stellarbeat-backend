import { Edge, TrustGraph, Vertex } from '@stellarbeat/js-stellarbeat-shared';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { TrustIndex } from '../../../index/trust-index';

const trustGraph = new TrustGraph(
	new StronglyConnectedComponentsFinder(),
	new NetworkTransitiveQuorumSetFinder()
);

const vertex1 = new Vertex('a', 'a', 1);
trustGraph.addVertex(vertex1);

const vertex2 = new Vertex('b', 'b', 1);
trustGraph.addVertex(vertex2);

const vertex3 = new Vertex('c', 'c', 1);
trustGraph.addVertex(vertex3);

const vertex4 = new Vertex('d', 'd', 1);
trustGraph.addVertex(vertex4);

trustGraph.addEdge(new Edge(vertex1, vertex2));
trustGraph.addEdge(new Edge(vertex2, vertex1));
trustGraph.addEdge(new Edge(vertex3, vertex1));
trustGraph.addEdge(new Edge(vertex4, vertex2));

test('get', () => {
	expect(TrustIndex.get(vertex1.key, trustGraph)).toEqual(2 / 3);
});
