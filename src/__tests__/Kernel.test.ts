import { NodeMeasurementV2Repository } from '../storage/repositories/NodeMeasurementV2Repository';
import { Connection, Repository } from 'typeorm';
import NodeSnapShotter from '../storage/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../storage/snapshotting/OrganizationSnapShotter';
import { NetworkUpdatePersister } from '../network-updater/services/NetworkUpdatePersister';
import NetworkMapper from '../services/NetworkMapper';
import Kernel from '../Kernel';
import { ConfigMock } from '../__mocks__/configMock';

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
	expect(container.get(NetworkUpdatePersister)).toBeInstanceOf(
		NetworkUpdatePersister
	);
	expect(container.get(NetworkMapper)).toBeInstanceOf(NetworkMapper);

	await container.get(Connection).close();
});
