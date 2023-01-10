import { Connection, Repository } from 'typeorm';
import NodeSnapShotter from '../../../network-scan/domain/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../../../network-scan/domain/snapshotting/OrganizationSnapShotter';
import { NetworkWriteRepository } from '../../../network-scan/infrastructure/repositories/NetworkWriteRepository';
import { NetworkReadRepositoryImplementation } from '../../../network-scan/infrastructure/repositories/NetworkReadRepository';
import Kernel from '../Kernel';
import { ConfigMock } from '../../config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../network-scan/domain/measurement/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../network-scan/infrastructure/di/di-types';
import { TypeOrmNodeMeasurementRepository } from '../../../network-scan/infrastructure/database/repositories/TypeOrmNodeMeasurementRepository';
import { NetworkReadRepository } from '../../../network-scan/services/NetworkReadRepository';

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
	expect(
		container.get(NETWORK_TYPES.VersionedOrganizationRepository)
	).toBeInstanceOf(Repository);
	expect(container.get(NodeSnapShotter)).toBeInstanceOf(NodeSnapShotter);
	expect(container.get(OrganizationSnapShotter)).toBeInstanceOf(
		OrganizationSnapShotter
	);
	expect(container.get(NetworkWriteRepository)).toBeInstanceOf(
		NetworkWriteRepository
	);
	expect(
		container.get<NetworkReadRepository>(NETWORK_TYPES.NetworkReadRepository)
	).toBeInstanceOf(NetworkReadRepositoryImplementation);

	await kernel.close();
});
