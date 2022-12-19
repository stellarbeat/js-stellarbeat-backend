import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { NodeMeasurementRepository } from '../NodeMeasurementRepository';
import NodeMeasurement from '../../../../domain/measurement/NodeMeasurement';
import PublicKey, { PublicKeyRepository } from '../../../../domain/PublicKey';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let networkUpdateRepository: NetworkUpdateRepository;
	let nodeMeasurementV2Repository: NodeMeasurementRepository;
	let nodePublicKeyStorageRepository: PublicKeyRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeMeasurementV2Repository = container.get(NodeMeasurementRepository);
		nodePublicKeyStorageRepository = container.get(
			'NodePublicKeyStorageRepository'
		);
		networkUpdateRepository = container.get(NetworkUpdateRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findInactiveAt', async () => {
		const nodePublicKeyStorage = new PublicKey('a');
		const nodePublicKeyStorageActive = new PublicKey('b');
		const nodePublicKeyStorageOtherTime = new PublicKey('c');
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
		await nodeMeasurementV2Repository.save([
			measurement,
			measurementActive,
			measurementOtherTime
		]);
		const measurements = await nodeMeasurementV2Repository.findInactiveAt(time);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].nodePublicKeyStorageId).toEqual(1);
	});

	test('findBetween', async () => {
		const idA = new PublicKey('a');
		const idB = new PublicKey('b');
		await nodePublicKeyStorageRepository.save([idA, idB]);
		await nodeMeasurementV2Repository.save([
			new NodeMeasurement(new Date('12/12/2020'), idA),
			new NodeMeasurement(new Date('12/12/2020'), idB),
			new NodeMeasurement(new Date('12/13/2020'), idA),
			new NodeMeasurement(new Date('12/13/2020'), idB)
		]);

		const measurements = await nodeMeasurementV2Repository.findBetween(
			idA.publicKey,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].nodePublicKeyStorage.publicKey).toEqual('a');
	});
});
