import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { mock } from 'jest-mock-extended';
import NodeSnapShotter from '../../../domain/snapshotting/NodeSnapShotter';
import { GetLatestNodeSnapshots } from '../GetLatestNodeSnapshots';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
});

afterAll(async () => {
	await kernel.close();
});

it('should fetch latest node snapshots', async () => {
	const snapShotter = mock<NodeSnapShotter>();
	snapShotter.findLatestSnapShots.mockResolvedValue([]);
	kernel.container.rebind(NodeSnapShotter).toConstantValue(snapShotter);

	const useCase = kernel.container.get(GetLatestNodeSnapshots);
	const result = await useCase.execute({
		at: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
