import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { NetworkEventDetectionStrategy } from '../NetworkEventDetectionStrategy';
import NetworkService from '../../../services/NetworkService';
import Kernel from '../../../Kernel';
import { ConfigMock } from '../../../__mocks__/configMock';
import { Connection } from 'typeorm';
import { EventType } from '../../Event';
import { ok } from 'neverthrow';
import { ExceptionLoggerMock } from '../../../services/__mocks__/ExceptionLoggerMock';

const kernel = new Kernel();

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
});

afterEach(async () => {
	await kernel.container.get(Connection).close();
});

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

	const networkService = kernel.container.get(NetworkService);
	jest
		.spyOn(networkService, 'getPreviousNetwork')
		.mockResolvedValue(ok(new Network([nodeBCopy, nodeACopy])));
	const detector = new NetworkEventDetectionStrategy(
		networkService,
		new ExceptionLoggerMock()
	);

	let events = await detector.detect(network);
	expect(events).toHaveLength(0);

	const networkDifferentOrder = new Network([nodeB, nodeA]);
	events = await detector.detect(networkDifferentOrder);
	expect(events).toHaveLength(0);

	const nodeC = new Node('C');
	nodeC.isValidating = true;
	nodeC.quorumSet.threshold = 1;
	nodeC.quorumSet.validators.push('B');
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators.push('C');

	const changedNetwork = new Network([nodeA, nodeB, nodeC]);
	events = await detector.detect(changedNetwork);

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
