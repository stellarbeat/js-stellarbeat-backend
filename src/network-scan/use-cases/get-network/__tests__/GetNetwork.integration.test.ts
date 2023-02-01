import { Network } from '@stellarbeat/js-stellarbeat-shared';
import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import { ok } from 'neverthrow';
import { GetNetwork } from '../GetNetwork';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { NetworkDTOService } from '../../../services/NetworkDTOService';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch and return the network at the specified time', async () => {
	const networkDTOService = mock<NetworkDTOService>();
	const network = new Network();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(ok(network));
	kernel.container.rebind(NetworkDTOService).toConstantValue(networkDTOService);

	const getNetwork = kernel.container.get(GetNetwork);
	const result = await getNetwork.execute({ at: new Date() });
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
	expect(result.value).toBe(network);
});
