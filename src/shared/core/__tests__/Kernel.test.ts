import { NodeMeasurementV2Repository } from '../../../network/infrastructure/database/repositories/NodeMeasurementV2Repository';
import { Connection, Repository } from 'typeorm';
import NodeSnapShotter from '../../../network/infrastructure/database/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../../network/infrastructure/database/snapshotting/OrganizationSnapShotter';
import { NetworkWriteRepository } from '../../../network/repositories/NetworkWriteRepository';
import NetworkReadRepository from '../../../network/repositories/NetworkReadRepository';
import Kernel from '../Kernel';
import { ConfigMock } from '../../../config/__mocks__/configMock';

test('kernel', async () => {
	jest.setTimeout(10000); //slow and long integration test
	const kernel = new Kernel();
	await kernel.initializeContainer(new ConfigMock());
	const container = kernel.container;
	expect(container.get(NodeMeasurementV2Repository)).toBeInstanceOf(
		NodeMeasurementV2Repository
	);
	expect(container.get(Connection)).toBeInstanceOf(Connection);
	expect(container.get('OrganizationIdStorageRepository')).toBeInstanceOf(
		Repository
	);
	expect(container.get(NodeSnapShotter)).toBeInstanceOf(NodeSnapShotter);
	expect(container.get(OrganizationSnapShotter)).toBeInstanceOf(
		OrganizationSnapShotter
	);
	expect(container.get(NetworkWriteRepository)).toBeInstanceOf(
		NetworkWriteRepository
	);
	expect(container.get(NetworkReadRepository)).toBeInstanceOf(
		NetworkReadRepository
	);

	await container.get(Connection).close();
});
