import { NodeMeasurementV2Repository } from '../../../network/infrastructure/database/repositories/NodeMeasurementV2Repository';
import { Connection, Repository } from 'typeorm';
import NodeSnapShotter from '../../../network/infrastructure/database/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../../network/infrastructure/database/snapshotting/OrganizationSnapShotter';
import { NetworkWriteRepository } from '../../../network/infrastructure/repositories/NetworkWriteRepository';
import { NetworkReadRepositoryImplementation } from '../../../network/infrastructure/repositories/NetworkReadRepository';
import Kernel from '../Kernel';
import { ConfigMock } from '../../config/__mocks__/configMock';
import { TYPES } from '../di/di-types';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';

jest.setTimeout(10000); //slow and long integration test

test('kernel', async () => {
	const kernel = await Kernel.getInstance(new ConfigMock());
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
	expect(
		container.get<NetworkReadRepository>(TYPES.NetworkReadRepository)
	).toBeInstanceOf(NetworkReadRepositoryImplementation);

	await kernel.close();
});
