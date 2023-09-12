import { Connection, DataSource } from 'typeorm';
import Kernel from '../Kernel';
import { ConfigMock } from '../../config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../network-scan/domain/node/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../network-scan/infrastructure/di/di-types';
import { TypeOrmNodeMeasurementRepository } from '../../../network-scan/infrastructure/database/repositories/TypeOrmNodeMeasurementRepository';
import { TypeOrmOrganizationRepository } from '../../../network-scan/infrastructure/database/repositories/TypeOrmOrganizationRepository';

jest.setTimeout(10000); //slow and long integration test

test('kernel', async () => {
	const kernel = await Kernel.getInstance(new ConfigMock());
	const container = kernel.container;
	expect(
		container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		)
	).toBeInstanceOf(TypeOrmNodeMeasurementRepository);
	expect(container.get(DataSource)).toBeInstanceOf(DataSource);
	expect(container.get(NETWORK_TYPES.OrganizationRepository)).toBeInstanceOf(
		TypeOrmOrganizationRepository
	);

	await kernel.close();
});
