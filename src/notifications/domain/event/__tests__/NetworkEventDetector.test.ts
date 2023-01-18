import { Network, Node } from '@stellarbeat/js-stellarbeat-shared';
import { NetworkEventDetector } from '../NetworkEventDetector';
import {
	NetworkLossOfLivenessEvent,
	NetworkLossOfSafetyEvent,
	NetworkNodeLivenessRiskEvent,
	NetworkNodeSafetyRiskEvent,
	NetworkOrganizationLivenessRiskEvent,
	NetworkOrganizationSafetyRiskEvent,
	NetworkTransitiveQuorumSetChangedEvent
} from '../Event';

it('should return an event when the network transitive quorum set has changed', async function () {
	const nodeA = new Node('A');
	nodeA.name = 'name-a';
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 1;
	nodeA.quorumSet.validators.push('B');

	const nodeB = new Node('B');
	nodeB.name = 'name-b';
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 1;
	nodeB.quorumSet.validators.push('A');

	const network = new Network([nodeA, nodeB]);
	network.id = 'public';

	expect(network.nodesTrustGraph.networkTransitiveQuorumSet).toEqual(
		new Set(['B', 'A'])
	);

	const nodeACopy = Node.fromJSON(JSON.stringify(nodeA));
	const nodeBCopy = Node.fromJSON(JSON.stringify(nodeB));
	const previousNetwork = new Network([nodeBCopy, nodeACopy]);
	const detector = new NetworkEventDetector();

	previousNetwork.networkStatistics.minBlockingSetFilteredSize = 6;
	network.networkStatistics.minBlockingSetFilteredSize = 6;
	previousNetwork.networkStatistics.minSplittingSetSize = 6;
	network.networkStatistics.minSplittingSetSize = 6;
	previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 6;
	network.networkStatistics.minBlockingSetOrgsFilteredSize = 6;
	previousNetwork.networkStatistics.minSplittingSetOrgsSize = 6;
	network.networkStatistics.minSplittingSetOrgsSize = 6;

	let events = await detector.detect(network, previousNetwork);
	if (events.isErr()) throw events.error;

	expect(events.value).toHaveLength(0);

	const networkDifferentOrder = new Network([nodeB, nodeA]);
	networkDifferentOrder.id = 'public';
	networkDifferentOrder.networkStatistics.minBlockingSetFilteredSize = 6;
	networkDifferentOrder.networkStatistics.minSplittingSetSize = 6;
	networkDifferentOrder.networkStatistics.minBlockingSetOrgsFilteredSize = 6;
	networkDifferentOrder.networkStatistics.minSplittingSetOrgsSize = 6;

	events = await detector.detect(networkDifferentOrder, previousNetwork);
	if (events.isErr()) throw events.error;

	expect(events.value).toHaveLength(0);

	const nodeC = new Node('C');
	nodeC.name = 'name-c';
	nodeC.isValidating = true;
	nodeC.quorumSet.threshold = 1;
	nodeC.quorumSet.validators.push('B');
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators.push('C');

	const changedNetwork = new Network([nodeA, nodeB, nodeC]);
	changedNetwork.id = 'public';
	changedNetwork.networkStatistics.minBlockingSetFilteredSize = 6;
	changedNetwork.networkStatistics.minSplittingSetSize = 6;
	changedNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 6;
	changedNetwork.networkStatistics.minSplittingSetOrgsSize = 6;

	events = await detector.detect(changedNetwork, previousNetwork);
	if (events.isErr()) throw events.error;

	expect(events.value).toHaveLength(1);
	const networkTransitiveQuorumSetChangedEvents = events.value.filter(
		(event) => event instanceof NetworkTransitiveQuorumSetChangedEvent
	);
	expect(networkTransitiveQuorumSetChangedEvents).toHaveLength(1);

	expect(
		new Set(networkTransitiveQuorumSetChangedEvents[0].data.from as [])
	).toEqual(new Set(['name-a', 'name-b']));
	expect(
		new Set(networkTransitiveQuorumSetChangedEvents[0].data.to as [])
	).toEqual(new Set(['name-a', 'name-b', 'name-c']));
	expect(
		events.value.filter((event) => event.time === changedNetwork.time)
	).toHaveLength(1);
});

describe('Liveness and safety events', function () {
	const nodeA = new Node('A');
	const nodeB = new Node('B');

	const network = new Network([nodeA, nodeB]);
	network.id = 'public';
	const previousNetwork = new Network([nodeA, nodeB]);
	previousNetwork.id = 'public';

	const detector = new NetworkEventDetector();

	it('should generate a liveness or safety risk event when it hits threshold and previous network did not have risk', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 4;
		network.networkStatistics.minBlockingSetFilteredSize = 3;
		previousNetwork.networkStatistics.minSplittingSetSize = 2;
		network.networkStatistics.minSplittingSetSize = 1;
		previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 2;
		network.networkStatistics.minBlockingSetOrgsFilteredSize = 1;
		previousNetwork.networkStatistics.minSplittingSetOrgsSize = 2;
		network.networkStatistics.minSplittingSetOrgsSize = 1;

		const eventResult = await detector.detect(network, previousNetwork);
		expect(eventResult.isErr()).toBeFalsy();
		if (eventResult.isErr()) return;
		let events = eventResult.value.filter(
			(event) => event instanceof NetworkNodeLivenessRiskEvent
		);
		expect(events).toHaveLength(1);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkNodeSafetyRiskEvent
		);
		expect(events).toHaveLength(1);

		expect(
			eventResult.value.filter((event) => {
				return event instanceof NetworkOrganizationLivenessRiskEvent;
			})
		).toHaveLength(1);

		expect(
			eventResult.value.filter((event) => {
				return event instanceof NetworkOrganizationSafetyRiskEvent;
			})
		).toHaveLength(1);
	});

	it('should not generate a liveness or safety risk event when it hits threshold and previous network also had liveness risk', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 3;
		network.networkStatistics.minBlockingSetFilteredSize = 2;
		previousNetwork.networkStatistics.minSplittingSetSize = 1;
		network.networkStatistics.minSplittingSetSize = 1;
		previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 1;
		network.networkStatistics.minBlockingSetOrgsFilteredSize = 1;
		previousNetwork.networkStatistics.minSplittingSetOrgsSize = 1;
		network.networkStatistics.minSplittingSetOrgsSize = 1;

		const eventResult = await detector.detect(network, previousNetwork);
		expect(eventResult.isErr()).toBeFalsy();
		if (eventResult.isErr()) return;
		let events = eventResult.value.filter(
			(event) => event instanceof NetworkNodeLivenessRiskEvent
		);
		expect(events).toHaveLength(0);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkNodeSafetyRiskEvent
		);
		expect(events).toHaveLength(0);
	});

	it('should not generate a liveness or safety risk event when the network is down or lacking quorum intersection', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 3;
		network.networkStatistics.minBlockingSetFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetSize = 1;
		network.networkStatistics.minSplittingSetSize = 0;
		previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 0;
		network.networkStatistics.minBlockingSetOrgsFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetOrgsSize = 0;
		network.networkStatistics.minSplittingSetOrgsSize = 0;

		const eventResult = await detector.detect(network, previousNetwork);
		expect(eventResult.isErr()).toBeFalsy();
		if (eventResult.isErr()) return;

		let events = eventResult.value.filter(
			(event) => event instanceof NetworkNodeLivenessRiskEvent
		);
		expect(events).toHaveLength(0);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkOrganizationLivenessRiskEvent
		);
		expect(events).toHaveLength(0);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkOrganizationSafetyRiskEvent
		);
		expect(events).toHaveLength(0);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkNodeSafetyRiskEvent
		);
		expect(events).toHaveLength(0);
	});

	it('should generate a loss of liveness or safety event when previous network did not have loss', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 4;
		network.networkStatistics.minBlockingSetFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetSize = 4;
		network.networkStatistics.minSplittingSetSize = 0;
		previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 1;
		network.networkStatistics.minBlockingSetOrgsFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetOrgsSize = 1;
		network.networkStatistics.minSplittingSetOrgsSize = 0;

		const eventResult = await detector.detect(network, previousNetwork);
		expect(eventResult.isErr()).toBeFalsy();
		if (eventResult.isErr()) return;

		let events = eventResult.value.filter(
			(event) => event instanceof NetworkLossOfLivenessEvent
		);
		expect(events).toHaveLength(1);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkLossOfSafetyEvent
		);
		expect(events).toHaveLength(1);
	});

	it('should not generate a loss of liveness or safety event when previous network also had loss', async function () {
		previousNetwork.networkStatistics.minBlockingSetFilteredSize = 0;
		network.networkStatistics.minBlockingSetFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetSize = 0;
		network.networkStatistics.minSplittingSetSize = 0;
		previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize = 0;
		network.networkStatistics.minBlockingSetOrgsFilteredSize = 0;
		previousNetwork.networkStatistics.minSplittingSetOrgsSize = 0;
		network.networkStatistics.minSplittingSetOrgsSize = 0;

		const eventResult = await detector.detect(network, previousNetwork);
		expect(eventResult.isErr()).toBeFalsy();
		if (eventResult.isErr()) return;

		let events = eventResult.value.filter(
			(event) => event instanceof NetworkLossOfLivenessEvent
		);
		expect(events).toHaveLength(0);

		events = eventResult.value.filter(
			(event) => event instanceof NetworkLossOfSafetyEvent
		);
		expect(events).toHaveLength(0);
	});
});
