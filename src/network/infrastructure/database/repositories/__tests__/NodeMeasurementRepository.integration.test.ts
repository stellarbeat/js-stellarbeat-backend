import { Container } from 'inversify';
import Kernel from '../../../../../shared/core/Kernel';
import { NodeMeasurementV2Repository } from '../NodeMeasurementV2Repository';
import NodeMeasurementV2 from '../../entities/NodeMeasurementV2';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../entities/NodePublicKeyStorage';
import { ConfigMock } from '../../../../../shared/config/__mocks__/configMock';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let networkUpdateRepository: NetworkUpdateRepository;
	let nodeMeasurementV2Repository: NodeMeasurementV2Repository;
	let nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeMeasurementV2Repository = container.get(NodeMeasurementV2Repository);
		nodePublicKeyStorageRepository = container.get(
			'NodePublicKeyStorageRepository'
		);
		networkUpdateRepository = container.get(NetworkUpdateRepository);
	});

	afterEach(async () => {
		await kernel.close();
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
