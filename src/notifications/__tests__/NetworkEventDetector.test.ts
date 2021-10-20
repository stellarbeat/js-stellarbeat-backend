import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { NetworkEventDetector } from '../NetworkEventDetector';
import { EventType } from '../Event';

it('should return an event when the network transitive quorum set has changed', async function () {
	const nodeA = new Node('A');
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 1;
	nodeA.quorumSet.validators.push('B');

	const nodeB = new Node('B');
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 1;
	nodeB.quorumSet.validators.push('A');

	const network = new Network([nodeA, nodeB]);
	expect(network.nodesTrustGraph.networkTransitiveQuorumSet).toEqual(
		new Set(['B', 'A'])
	);

	const nodeACopy = Node.fromJSON(JSON.stringify(nodeA));
	const nodeBCopy = Node.fromJSON(JSON.stringify(nodeB));
	const previousNetwork = new Network([nodeBCopy, nodeACopy]);
	const detector = new NetworkEventDetector();

	let events = await detector.detect(network, previousNetwork);
	expect(events).toHaveLength(0);

	const networkDifferentOrder = new Network([nodeB, nodeA]);
	events = await detector.detect(networkDifferentOrder, previousNetwork);
	expect(events).toHaveLength(0);

	const nodeC = new Node('C');
	nodeC.isValidating = true;
	nodeC.quorumSet.threshold = 1;
	nodeC.quorumSet.validators.push('B');
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators.push('C');

	const changedNetwork = new Network([nodeA, nodeB, nodeC]);
	events = await detector.detect(changedNetwork, previousNetwork);

	expect(events).toHaveLength(1);
	expect(
		events.filter(
			(event) => event.type === EventType.NetworkTransitiveQuorumSetChanged
		)
	).toHaveLength(1);

	expect(
		events.filter((event) => event.time === changedNetwork.time)
	).toHaveLength(1);
});

describe('Liveness and safety events', function () {
	const nodeA = new Node('A');
	const nodeB = new Node('B');

	const network = new Network([nodeA, nodeB]);

	const previousNetwork = new Network([nodeA, nodeB]);

	const detector = new NetworkEventDetector();

	it('should generate a liveness or safety risk event when it hits threshold and previous network did not have risk', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 4;
		network.networkStatistics.minBlockingSetFilteredSize = 3;
		previousNetwork.networkStatistics.minSplittingSetSize = 2;
		network.networkStatistics.minSplittingSetSize = 1;

		let events = await detector.detect(network, previousNetwork);
		events = events.filter(
			(event) => event.type === EventType.NetworkNodeLivenessRisk
		);
		expect(events).toHaveLength(1);

		events = events.filter(
			(event) => event.type === EventType.NetworkNodeSafetyRisk
		);
		expect(events).toHaveLength(1);
	});

	it('should not generate a liveness or safety risk event when it hits threshold and previous network also had liveness risk', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 3;
		network.networkStatistics.minBlockingSetFilteredSize = 3;
		previousNetwork.networkStatistics.minSplittingSetSize = 1;
		previousNetwork.networkStatistics.minSplittingSetSize = 1;

		let events = await detector.detect(network, previousNetwork);
		events = events.filter(
			(event) => event.type === EventType.NetworkNodeLivenessRisk
		);
		expect(events).toHaveLength(0);

		events = events.filter(
			(event) => event.type === EventType.NetworkNodeSafetyRisk
		);
		expect(events).toHaveLength(0);
	});

	it('should not generate a liveness or safety risk event when the network is down or lacking quorum intersection', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 3;
		network.networkStatistics.minBlockingSetFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetSize = 1;
		network.networkStatistics.minSplittingSetSize = 0;

		let events = await detector.detect(network, previousNetwork);
		events = events.filter(
			(event) => event.type === EventType.NetworkNodeLivenessRisk
		);
		expect(events).toHaveLength(0);

		events = events.filter(
			(event) => event.type === EventType.NetworkNodeSafetyRisk
		);
		expect(events).toHaveLength(0);
	});

	it('should generate a loss of liveness or safety event when previous network did not have loss', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 4;
		network.networkStatistics.minBlockingSetFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetSize = 4;
		network.networkStatistics.minSplittingSetSize = 0;

		let events = await detector.detect(network, previousNetwork);
		events = events.filter(
			(event) => event.type === EventType.NetworkLossOfLiveness
		);
		expect(events).toHaveLength(1);

		events = events.filter(
			(event) => event.type === EventType.NetworkLossOfSafety
		);
		expect(events).toHaveLength(1);
	});

	it('should not generate a loss of liveness or safety event when previous network also had loss', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 0;
		network.networkStatistics.minBlockingSetFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetSize = 0;
		network.networkStatistics.minSplittingSetSize = 0;

		let events = await detector.detect(network, previousNetwork);
		events = events.filter(
			(event) => event.type === EventType.NetworkLossOfLiveness
		);
		expect(events).toHaveLength(0);

		events = events.filter(
			(event) => event.type === EventType.NetworkLossOfSafety
		);
		expect(events).toHaveLength(0);
	});
});
