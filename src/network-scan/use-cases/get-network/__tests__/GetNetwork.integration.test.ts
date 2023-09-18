import { Network } from '@stellarbeat/js-stellarbeat-shared';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import { ok } from 'neverthrow';
import { GetNetwork } from '../GetNetwork';
import { NetworkDTOService } from '../../../services/NetworkDTOService';
import { createDummyNetworkV1 } from '../../../services/__fixtures__/createDummyNetworkV1';
import { CachedNetworkDTOService } from '../../../services/CachedNetworkDTOService';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch and return the network at the specified time', async () => {
	const networkDTOService = mock<CachedNetworkDTOService>();
	const network = createDummyNetworkV1();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(ok(network));
	kernel.container
		.rebind(CachedNetworkDTOService)
		.toConstantValue(networkDTOService);

	const getNetwork = kernel.container.get(GetNetwork);
	const result = await getNetwork.execute({ at: new Date() });
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
	expect(result.value).toBe(network);
});
