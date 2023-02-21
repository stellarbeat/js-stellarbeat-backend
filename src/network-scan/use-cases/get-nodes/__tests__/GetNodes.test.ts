import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import { GetNodes } from '../GetNodes';
import { createDummyNetworkV1 } from '../../../services/__fixtures__/createDummyNetworkV1';
import { createDummyNodeV1 } from '../../../services/__fixtures__/createDummyNodeV1';

it('should return nodes', async function () {
	const getNetwork = mock<GetNetwork>();
	const network = createDummyNetworkV1();
	network.nodes = [createDummyNodeV1()];
	getNetwork.execute.mockResolvedValue(ok(network));
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
