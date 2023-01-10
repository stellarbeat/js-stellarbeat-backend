import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { GetNodes } from '../GetNodes';

it('should return nodes', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(ok(new Network([new Node('a')])));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNodes = new GetNodes(getNetwork, exceptionLogger);
	const result = await getNodes.execute({ at: new Date() });
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toHaveLength(1);
});

it('should return no nodes if no network is found', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(ok(null));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNodes = new GetNodes(getNetwork, exceptionLogger);
	const result = await getNodes.execute({ at: new Date() });
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toHaveLength(0);
});

it('should return error if getNetwork fails', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(err(new Error('test')));
	const exceptionLogger = mock<ExceptionLogger>();

	const getNodes = new GetNodes(getNetwork, exceptionLogger);
	const result = await getNodes.execute({ at: new Date() });
	expect(result.isErr()).toBe(true);
});
