import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import { GetNode } from '../GetNode';
import { createDummyNetworkV1 } from '../../../services/__fixtures__/createDummyNetworkV1';
import { createDummyNodeV1 } from '../../../services/__fixtures__/createDummyNodeV1';

it('should return node', async function () {
	const getNetwork = mock<GetNetwork>();
	const network = createDummyNetworkV1();
	network.nodes = [createDummyNodeV1()];
	getNetwork.execute.mockResolvedValue(ok(network));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNode = new GetNode(getNetwork, exceptionLogger);
	const result = await getNode.execute({
		at: new Date(),
		publicKey: network.nodes[0].publicKey
	});
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value?.publicKey).toBe(network.nodes[0].publicKey);
});

it('should return no node if no network is found', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(ok(null));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNodes = new GetNode(getNetwork, exceptionLogger);
	const result = await getNodes.execute({ at: new Date(), publicKey: 'a' });
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toEqual(null);
});

it('should return error if retrieving network fails', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(err(new Error('test')));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNodes = new GetNode(getNetwork, exceptionLogger);
	const result = await getNodes.execute({ at: new Date(), publicKey: 'a' });
	expect(result.isErr()).toBe(true);
});
