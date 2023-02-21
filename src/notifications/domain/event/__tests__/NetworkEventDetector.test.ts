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
import { createDummyNodeV1 } from '../../../../network-scan/services/__fixtures__/createDummyNodeV1';
import { createDummyNetworkV1 } from '../../../../network-scan/services/__fixtures__/createDummyNetworkV1';

describe('NetworkEventDetector', function () {
	it('should return an event when the network transitive quorum set has changed', async function () {
		const nodeA = createDummyNodeV1('A');
		nodeA.name = 'name-a';
		const nodeB = createDummyNodeV1('B');
		nodeB.name = 'name-b';
		const nodeC = createDummyNodeV1('C');
		nodeC.name = 'name-c';

		const network = createDummyNetworkV1([nodeA, nodeB]);
		network.transitiveQuorumSet = ['A', 'B'];

		const previousNetwork = createDummyNetworkV1([nodeA, nodeB]);
		previousNetwork.transitiveQuorumSet = ['A', 'B'];
		const detector = new NetworkEventDetector();

		let events = await detector.detect(network, previousNetwork);
		if (events.isErr()) throw events.error;

		expect(events.value).toHaveLength(0);

		const networkWithTransitiveQSetDifferentOrder = createDummyNetworkV1([
			nodeA,
			nodeB
		]);
		networkWithTransitiveQSetDifferentOrder.transitiveQuorumSet = ['B', 'A'];

		events = await detector.detect(
			networkWithTransitiveQSetDifferentOrder,
			previousNetwork
		);
		if (events.isErr()) throw events.error;

		expect(events.value).toHaveLength(0);

		const changedNetwork = createDummyNetworkV1([nodeA, nodeB, nodeC]);
		changedNetwork.transitiveQuorumSet = ['A', 'B', 'C'];

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
			events.value.filter(
				(event) =>
					event.time.getTime() === new Date(changedNetwork.time).getTime()
			)
		).toHaveLength(1);
	});

	describe('Liveness and safety events', function () {
		const nodeA = createDummyNodeV1('A');
		const nodeB = createDummyNodeV1('B');

		const network = createDummyNetworkV1([nodeA, nodeB]);
		network.id = 'public';
		const previousNetwork = createDummyNetworkV1([nodeA, nodeB]);
		previousNetwork.id = 'public';

		const detector = new NetworkEventDetector();

		it('should generate a liveness or safety risk event when it hits threshold and previous network did not have risk', async function () {
			previousNetwork.statistics.minBlockingSetFilteredSize = 4;
			network.statistics.minBlockingSetFilteredSize = 3;
			previousNetwork.statistics.minSplittingSetSize = 2;
			network.statistics.minSplittingSetSize = 1;
			previousNetwork.statistics.minBlockingSetOrgsFilteredSize = 2;
			network.statistics.minBlockingSetOrgsFilteredSize = 1;
			previousNetwork.statistics.minSplittingSetOrgsSize = 2;
			network.statistics.minSplittingSetOrgsSize = 1;

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
			previousNetwork.statistics.minBlockingSetFilteredSize = 3;
			network.statistics.minBlockingSetFilteredSize = 2;
			previousNetwork.statistics.minSplittingSetSize = 1;
			network.statistics.minSplittingSetSize = 1;
			previousNetwork.statistics.minBlockingSetOrgsFilteredSize = 1;
			network.statistics.minBlockingSetOrgsFilteredSize = 1;
			previousNetwork.statistics.minSplittingSetOrgsSize = 1;
			network.statistics.minSplittingSetOrgsSize = 1;

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
			previousNetwork.statistics.minBlockingSetFilteredSize = 3;
			network.statistics.minBlockingSetFilteredSize = 0;
			previousNetwork.statistics.minSplittingSetSize = 1;
			network.statistics.minSplittingSetSize = 0;
			previousNetwork.statistics.minBlockingSetOrgsFilteredSize = 0;
			network.statistics.minBlockingSetOrgsFilteredSize = 0;
			previousNetwork.statistics.minSplittingSetOrgsSize = 0;
			network.statistics.minSplittingSetOrgsSize = 0;

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
			previousNetwork.statistics.minBlockingSetFilteredSize = 4;
			network.statistics.minBlockingSetFilteredSize = 0;
			previousNetwork.statistics.minSplittingSetSize = 4;
			network.statistics.minSplittingSetSize = 0;
			previousNetwork.statistics.minBlockingSetOrgsFilteredSize = 1;
			network.statistics.minBlockingSetOrgsFilteredSize = 0;
			previousNetwork.statistics.minSplittingSetOrgsSize = 1;
			network.statistics.minSplittingSetOrgsSize = 0;

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
			previousNetwork.statistics.minBlockingSetFilteredSize = 0;
			network.statistics.minBlockingSetFilteredSize = 0;
			previousNetwork.statistics.minSplittingSetSize = 0;
			network.statistics.minSplittingSetSize = 0;
			previousNetwork.statistics.minBlockingSetOrgsFilteredSize = 0;
			network.statistics.minBlockingSetOrgsFilteredSize = 0;
			previousNetwork.statistics.minSplittingSetOrgsSize = 0;
			network.statistics.minSplittingSetOrgsSize = 0;

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
});
