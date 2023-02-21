import 'reflect-metadata';
import { EventSourceFromNetworkService } from '../EventSourceFromNetworkService';
import { ok } from 'neverthrow';
import { NetworkId, OrganizationId } from '../../../domain/event/EventSourceId';
import { EventSource } from '../../../domain/event/EventSource';
import { NetworkDTOService } from '../../../../network-scan/services/NetworkDTOService';
import { createDummyNodeV1 } from '../../../../network-scan/services/__fixtures__/createDummyNodeV1';
import { createDummyNetworkV1 } from '../../../../network-scan/services/__fixtures__/createDummyNetworkV1';
import { mock } from 'jest-mock-extended';
import { createDummyOrganizationV1 } from '../../../../network-scan/services/__fixtures__/createDummyOrganizationV1';
import { createDummyPublicKey } from '../../../../network-scan/domain/node/__fixtures__/createDummyPublicKey';

it('should determine if the given EventSourceId is known in the network', async function () {
	const publicKeyA = createDummyPublicKey();
	const nodeA = createDummyNodeV1(publicKeyA.value);
	const nodeB = createDummyNodeV1();

	const network = createDummyNetworkV1([nodeA, nodeB]);

	const networkDTOService = mock<NetworkDTOService>();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(ok(network));
	const eventSourceFromNetworkService = new EventSourceFromNetworkService(
		networkDTOService
	);

	expect(
		await eventSourceFromNetworkService.isEventSourceIdKnown(
			publicKeyA,
			new Date()
		)
	).toBeTruthy();
});

it('should find the event source', async function () {
	const publicKey = createDummyPublicKey();
	const node = createDummyNodeV1(publicKey.value);
	node.name = 'name';
	const organization = createDummyOrganizationV1();
	const network = createDummyNetworkV1([node], [organization]);
	const networkService = mock<NetworkDTOService>();
	networkService.getNetworkDTOAt.mockResolvedValue(ok(network));

	const eventSourceFromNetworkService = new EventSourceFromNetworkService(
		networkService
	);

	const nodeEventSource = await eventSourceFromNetworkService.findEventSource(
		publicKey,
		new Date()
	);
	if (nodeEventSource.isErr()) throw nodeEventSource.error;
	expect(nodeEventSource.value).toEqual(new EventSource(publicKey, node.name));

	const organizationEventSource =
		await eventSourceFromNetworkService.findEventSource(
			new OrganizationId(organization.id),
			new Date()
		);
	if (organizationEventSource.isErr()) throw organizationEventSource.error;
	expect(organizationEventSource.value).toEqual(
		new EventSource(
			new OrganizationId(organization.id),
			organization.name ?? organization.id
		)
	);

	const networkEventSource =
		await eventSourceFromNetworkService.findEventSource(
			new NetworkId(network.id),
			new Date()
		);
	if (networkEventSource.isErr()) throw networkEventSource.error;
	expect(networkEventSource.value).toEqual(
		new EventSource(new NetworkId(network.id), network.name)
	);
});
