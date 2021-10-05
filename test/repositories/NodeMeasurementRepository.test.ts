import { Container } from 'inversify';
import Kernel from '../../src/Kernel';
import { Connection } from 'typeorm';
import { NodeMeasurementV2Repository } from '../../src/repositories/NodeMeasurementV2Repository';
import NodeMeasurementV2 from '../../src/entities/NodeMeasurementV2';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../src/entities/NodePublicKeyStorage';
import { ConfigMock } from '../configMock';

describe('test queries', () => {
	let container: Container;
	const kernel = new Kernel();
	let nodeMeasurementV2Repository: NodeMeasurementV2Repository;
	let nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		await kernel.initializeContainer(new ConfigMock());
		container = kernel.container;
		nodeMeasurementV2Repository = container.get(NodeMeasurementV2Repository);
		nodePublicKeyStorageRepository = container.get(
			'NodePublicKeyStorageRepository'
		);
	});

	afterEach(async () => {
		await container.get(Connection).close();
	});

	test('findInactiveAt', async () => {
		const nodePublicKeyStorage = new NodePublicKeyStorage('a');
		const nodePublicKeyStorageActive = new NodePublicKeyStorage('b');
		const nodePublicKeyStorageOtherTime = new NodePublicKeyStorage('c');
		await nodePublicKeyStorageRepository.save([nodePublicKeyStorage]); //force id = 1
		await nodePublicKeyStorageRepository.save([
			nodePublicKeyStorageActive,
			nodePublicKeyStorageOtherTime
		]);
		const time = new Date();
		const measurement = new NodeMeasurementV2(time, nodePublicKeyStorage);
		measurement.isActive = false;
		const measurementActive = new NodeMeasurementV2(
			time,
			nodePublicKeyStorageActive
		);
		measurementActive.isActive = true;
		const measurementOtherTime = new NodeMeasurementV2(
			new Date('12/12/2020'),
			nodePublicKeyStorageOtherTime
		);
		measurementOtherTime.isActive = false;
		await nodeMeasurementV2Repository.save([
			measurement,
			measurementActive,
			measurementOtherTime
		]);
		const measurements = await nodeMeasurementV2Repository.findInactiveAt(time);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].nodePublicKeyStorageId).toEqual(1);
	});
});
