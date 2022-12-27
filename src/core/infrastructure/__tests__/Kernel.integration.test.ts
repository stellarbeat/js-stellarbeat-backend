import { Connection, Repository } from 'typeorm';
import NodeSnapShotter from '../../../network/domain/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../../network/domain/snapshotting/OrganizationSnapShotter';
import { NetworkWriteRepository } from '../../../network/infrastructure/repositories/NetworkWriteRepository';
import { NetworkReadRepositoryImplementation } from '../../../network/infrastructure/repositories/NetworkReadRepository';
import Kernel from '../Kernel';
import { ConfigMock } from '../../config/__mocks__/configMock';
import { CORE_TYPES } from '../di/di-types';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { NodeMeasurementRepository } from '../../../network/domain/measurement/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../network/infrastructure/di/di-types';
import { TypeOrmNodeMeasurementRepository } from '../../../network/infrastructure/database/repositories/TypeOrmNodeMeasurementRepository';

jest.setTimeout(10000); //slow and long integration test

test('kernel', async () => {
	const kernel = await Kernel.getInstance(new ConfigMock());
	const container = kernel.container;
	expect(
		container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		)
	).toBeInstanceOf(TypeOrmNodeMeasurementRepository);
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
		container.get<NetworkReadRepository>(CORE_TYPES.NetworkReadRepository)
	).toBeInstanceOf(NetworkReadRepositoryImplementation);

	await kernel.close();
});
