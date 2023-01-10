import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import OrganizationSnapShotter from '../../../domain/snapshotting/OrganizationSnapShotter';
import { GetLatestOrganizationSnapshots } from '../GetLatestOrganizationSnapshots';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch latest snapshots', async () => {
	const snapShotter = mock<OrganizationSnapShotter>();
	snapShotter.findLatestSnapShots.mockResolvedValue([]);
	kernel.container.rebind(OrganizationSnapShotter).toConstantValue(snapShotter);

	const useCase = kernel.container.get(GetLatestOrganizationSnapshots);
	const result = await useCase.execute({
		at: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
