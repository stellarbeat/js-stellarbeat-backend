import { EventSourceFromNetworkService } from '../EventSourceFromNetworkService';
import NetworkReadRepository, {
	IncompleteNetworkError
} from '../../../network/repositories/NetworkReadRepository';
import { ok, Result } from 'neverthrow';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { PublicKey } from '../../domain/event/EventSourceId';

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
		): Promise<Result<Network | null, IncompleteNetworkError>> {
			return Promise.resolve(ok(network));
		}
	} as NetworkReadRepository;
	const eventSourceFromNetworkService = new EventSourceFromNetworkService(
		'public',
		networkReadRepository
	);

	const publicKeyResult = PublicKey.create(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (!publicKeyResult.isOk()) return false;

	expect(
		await eventSourceFromNetworkService.isEventSourceIdKnown(
			publicKeyResult.value,
			new Date()
		)
	).toBeTruthy();
});
