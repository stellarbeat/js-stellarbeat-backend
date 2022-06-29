import 'reflect-metadata';
import { EventSourceFromNetworkService } from '../EventSourceFromNetworkService';
import { ok, Result } from 'neverthrow';
import {
	Network,
	NetworkReadRepository,
	Node,
	Organization
} from '@stellarbeat/js-stellar-domain';
import {
	NetworkId,
	OrganizationId,
	PublicKey
} from '../../../domain/event/EventSourceId';
import { EventSource } from '../../../domain/event/EventSource';

it('should determine if the given EventSourceId is known in the network', async function () {
	const nodeA = new Node(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZA'
	);
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 2;
	nodeA.quorumSet.validators = [
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZA',
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	];
	const nodeB = new Node(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators = [
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZA',
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	];
	const network = new Network([nodeA, nodeB]);

	const networkReadRepository: NetworkReadRepository = {
		async getNetwork(
			time: Date = new Date()
		): Promise<Result<Network | null, Error>> {
			return Promise.resolve(ok(network));
		}
	} as NetworkReadRepository;
	const eventSourceFromNetworkService = new EventSourceFromNetworkService(
		networkReadRepository
	);

	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	if (!publicKeyResult.isOk()) throw publicKeyResult.error;

	expect(
		await eventSourceFromNetworkService.isEventSourceIdKnown(
			publicKeyResult.value,
			new Date()
		)
	).toBeTruthy();
});

it('should find the event source', async function () {
	const node = new Node(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZA'
	);
	node.name = 'name';
	const organization = new Organization('1', 'organization');
	const network = new Network([node], [organization]);
	network.name = 'My custom network';
	network.id = 'custom';
	const networkReadRepository: NetworkReadRepository = {
		async getNetwork(
			time: Date = new Date()
		): Promise<Result<Network | null, Error>> {
			return Promise.resolve(ok(network));
		}
	} as NetworkReadRepository;
	const eventSourceFromNetworkService = new EventSourceFromNetworkService(
		networkReadRepository
	);

	const publicKeyResult = PublicKey.create(node.publicKey);
	if (!publicKeyResult.isOk()) throw publicKeyResult.error;

	const nodeEventSource = await eventSourceFromNetworkService.findEventSource(
		publicKeyResult.value,
		new Date()
	);
	if (nodeEventSource.isErr()) throw nodeEventSource.error;
	expect(nodeEventSource.value).toEqual(
		new EventSource(publicKeyResult.value, node.name)
	);

	const organizationEventSource =
		await eventSourceFromNetworkService.findEventSource(
			new OrganizationId(organization.id),
			new Date()
		);
	if (organizationEventSource.isErr()) throw organizationEventSource.error;
	expect(organizationEventSource.value).toEqual(
		new EventSource(new OrganizationId(organization.id), organization.name)
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
