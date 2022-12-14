import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { GetNode } from '../GetNode';

it('should return node', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(ok(new Network([new Node('a')])));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNode = new GetNode(getNetwork, exceptionLogger);
	const result = await getNode.execute({ at: new Date(), publicKey: 'a' });
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toBeInstanceOf(Node);
	expect(result.value?.publicKey).toBe('a');
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
