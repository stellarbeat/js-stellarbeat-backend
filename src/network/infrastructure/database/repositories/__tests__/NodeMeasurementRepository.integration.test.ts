import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import NodeMeasurement from '../../../../domain/measurement/NodeMeasurement';
import { PublicKeyRepository } from '../../../../domain/PublicKey';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../../domain/measurement/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyPublicKey } from '../../../../domain/__fixtures__/createDummyPublicKey';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeMeasurementRepository: NodeMeasurementRepository;
	let nodePublicKeyStorageRepository: PublicKeyRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		);
		nodePublicKeyStorageRepository = container.get(
			'NodePublicKeyStorageRepository'
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findInactiveAt', async () => {
		const nodePublicKeyStorage = createDummyPublicKey();
		const nodePublicKeyStorageActive = createDummyPublicKey();
		const nodePublicKeyStorageOtherTime = createDummyPublicKey();
		await nodePublicKeyStorageRepository.save([nodePublicKeyStorage]); //force id = 1
		await nodePublicKeyStorageRepository.save([
			nodePublicKeyStorageActive,
			nodePublicKeyStorageOtherTime
		]);
		const time = new Date();
		const measurement = new NodeMeasurement(time, nodePublicKeyStorage);
		measurement.isActive = false;
		const measurementActive = new NodeMeasurement(
			time,
			nodePublicKeyStorageActive
		);
		measurementActive.isActive = true;
		const measurementOtherTime = new NodeMeasurement(
			new Date('12/12/2020'),
			nodePublicKeyStorageOtherTime
		);
		measurementOtherTime.isActive = false;
		await nodeMeasurementRepository.save([
			measurement,
			measurementActive,
			measurementOtherTime
		]);
		const measurements = await nodeMeasurementRepository.findInactiveAt(time);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].nodePublicKeyStorageId).toEqual(1);
	});

	test('findBetween', async () => {
		const idA = createDummyPublicKey();
		const idB = createDummyPublicKey();
		await nodePublicKeyStorageRepository.save([idA, idB]);
		await nodeMeasurementRepository.save([
			new NodeMeasurement(new Date('12/12/2020'), idA),
			new NodeMeasurement(new Date('12/12/2020'), idB),
			new NodeMeasurement(new Date('12/13/2020'), idA),
			new NodeMeasurement(new Date('12/13/2020'), idB)
		]);

		const measurements = await nodeMeasurementRepository.findBetween(
			idA.value,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].nodePublicKeyStorage.value).toEqual(idA.value);
	});
});
