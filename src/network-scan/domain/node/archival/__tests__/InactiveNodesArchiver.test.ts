import { mock } from 'jest-mock-extended';
import { NodeMeasurementDayRepository } from '../../NodeMeasurementDayRepository';
import { InactiveNodesArchiver } from '../InactiveNodesArchiver';
import { createDummyNode } from '../../__fixtures__/createDummyNode';
import { NodeScan } from '../../scan/NodeScan';
import { Edge, TrustGraph, Vertex } from '@stellarbeat/js-stellarbeat-shared';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { Snapshot } from '../../../../../core/domain/Snapshot';
import { Logger } from '../../../../../core/services/PinoLogger';
import NodeMeasurement from '../../NodeMeasurement';

describe('InactiveNodesArchiver', () => {
	function setupSUT() {
		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();
		const inactiveNodesArchiver = new InactiveNodesArchiver(
			nodeMeasurementDayRepository,
			mock<Logger>()
		);

		const historicallyInactiveNode = createDummyNode();
		const historicallyInactiveLatestMeasurement = new NodeMeasurement(
			new Date(),
			historicallyInactiveNode
		);
		historicallyInactiveLatestMeasurement.isActive = false;
		historicallyInactiveNode.addMeasurement(
			historicallyInactiveLatestMeasurement
		);

		const historicallyInactiveNodeWithTrustingNodes = createDummyNode();
		const inactiveMeasurementWithTrustingNodes = new NodeMeasurement(
			new Date(),
			historicallyInactiveNodeWithTrustingNodes
		);
		inactiveMeasurementWithTrustingNodes.isActive = false;
		historicallyInactiveNodeWithTrustingNodes.addMeasurement(
			inactiveMeasurementWithTrustingNodes
		);

		const activeNode = createDummyNode();
		const activeMeasurement = new NodeMeasurement(new Date(), activeNode);
		activeMeasurement.isActive = true;
		activeNode.addMeasurement(activeMeasurement);

		nodeMeasurementDayRepository.findXDaysInactive.mockResolvedValue([
			{
				publicKey: historicallyInactiveNode.publicKey.value
			},
			{
				publicKey: historicallyInactiveNodeWithTrustingNodes.publicKey.value
			}
		]);

		const nodeScan = new NodeScan(new Date(), [
			historicallyInactiveNode,
			historicallyInactiveNodeWithTrustingNodes,
			activeNode
		]);

		const nodesTrustGraph = new TrustGraph(
			new StronglyConnectedComponentsFinder(),
			new NetworkTransitiveQuorumSetFinder()
		);
		const inactiveNodeVertex = new Vertex(
			historicallyInactiveNode.publicKey.value,
			'inactive',
			0
		);
		const inactiveNodeWithTrustingNodesVertex = new Vertex(
			historicallyInactiveNodeWithTrustingNodes.publicKey.value,
			'inactiveButTrusted',
			0
		);
		const activeNodeVertex = new Vertex(
			activeNode.publicKey.value,
			'active',
			0
		);
		nodesTrustGraph.addVertex(inactiveNodeVertex);
		nodesTrustGraph.addVertex(inactiveNodeWithTrustingNodesVertex);
		nodesTrustGraph.addVertex(activeNodeVertex);

		nodesTrustGraph.addEdge(
			new Edge(activeNodeVertex, inactiveNodeWithTrustingNodesVertex)
		);
		return {
			inactiveNodesArchiver,
			historicallyInactiveNode,
			nodeScan,
			nodesTrustGraph,
			historicallyInactiveLatestMeasurement
		};
	}

	test('archive inactive node that was historically inactive', async () => {
		const {
			inactiveNodesArchiver,
			historicallyInactiveNode,
			nodeScan,
			nodesTrustGraph
		} = setupSUT();

		await inactiveNodesArchiver.archive(nodeScan, nodesTrustGraph, 7);

		const archivedNodes = nodeScan.nodes.filter(
			(node) => node.snapshotEndDate.getTime() === nodeScan.time.getTime()
		);
		const activeNodes = nodeScan.nodes.filter(
			(node) => node.snapshotEndDate.getTime() === Snapshot.MAX_DATE.getTime()
		);

		expect(archivedNodes).toHaveLength(1);
		expect(activeNodes).toHaveLength(2);
		expect(archivedNodes[0].publicKey).toEqual(
			historicallyInactiveNode.publicKey
		);
	});

	test('do not archive active nodes that were historically inactive', async () => {
		const {
			inactiveNodesArchiver,
			historicallyInactiveLatestMeasurement,
			nodeScan,
			nodesTrustGraph
		} = setupSUT();
		historicallyInactiveLatestMeasurement.isActive = true;
		await inactiveNodesArchiver.archive(nodeScan, nodesTrustGraph, 7);

		const archivedNodes = nodeScan.nodes.filter(
			(node) => node.snapshotEndDate.getTime() === nodeScan.time.getTime()
		);
		const activeNodes = nodeScan.nodes.filter(
			(node) => node.snapshotEndDate.getTime() === Snapshot.MAX_DATE.getTime()
		);

		expect(archivedNodes).toHaveLength(0);
		expect(activeNodes).toHaveLength(3);
	});
});
