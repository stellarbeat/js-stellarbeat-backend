import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';

export class TrustIndex {
	static get(vertexId: string, nodesTrustGraph: TrustGraph): number {
		const vertex = nodesTrustGraph.getVertex(vertexId);

		if (!vertex) return 0;

		if (
			Array.from(nodesTrustGraph.vertices.values()).filter(
				(vertex) => nodesTrustGraph.getOutDegree(vertex) > 0
			).length -
				1 ===
			0
		)
			return 0;
		return (
			Array.from(nodesTrustGraph.getParents(vertex)).filter(
				(trustingVertex) => trustingVertex.key !== vertex.key
			).length /
			(Array.from(nodesTrustGraph.vertices.values()).filter(
				(vertex) => nodesTrustGraph.getOutDegree(vertex) > 0
			).length -
				1)
		); //exclude the node itself
	}
}
