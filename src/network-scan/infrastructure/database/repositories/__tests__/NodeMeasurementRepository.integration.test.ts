import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import NodeMeasurement from '../../../../domain/node/NodeMeasurement';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../../domain/node/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyNode } from '../../../../domain/node/__fixtures__/createDummyNode';
import { NodeRepository } from '../../../../domain/node/NodeRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeMeasurementRepository: NodeMeasurementRepository;
	let nodeRepository: NodeRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		);
		nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const result = await nodeMeasurementRepository.findBetween(
			'a',
			new Date(),
			new Date()
		);
		expect(result).toEqual([]);
	});

	test('findInactiveAt', async () => {
		const node = createDummyNode();
		const nodeActive = createDummyNode();
		const nodeOtherTime = createDummyNode();
		await nodeRepository.save([node]); //force id = 1
		await nodeRepository.save([nodeActive, nodeOtherTime]);
		const time = new Date();
		const measurement = new NodeMeasurement(time, node);
		measurement.isActive = false;
		const measurementActive = new NodeMeasurement(time, nodeActive);
		measurementActive.isActive = true;
		const measurementOtherTime = new NodeMeasurement(
			new Date('12/12/2020'),
			nodeOtherTime
		);
		measurementOtherTime.isActive = false;
		await nodeMeasurementRepository.save([
			measurement,
			measurementActive,
			measurementOtherTime
		]);
		const measurements = await nodeMeasurementRepository.findInactiveAt(time);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].nodeId).toEqual(1);
	});

	test('findBetween', async () => {
		const idA = createDummyNode();
		const idB = createDummyNode();
		await nodeRepository.save([idA, idB]);
		await nodeMeasurementRepository.save([
			new NodeMeasurement(new Date('12/12/2020'), idA),
			new NodeMeasurement(new Date('12/12/2020'), idB),
			new NodeMeasurement(new Date('12/13/2020'), idA),
			new NodeMeasurement(new Date('12/13/2020'), idB)
		]);

		const measurements = await nodeMeasurementRepository.findBetween(
			idA.publicKey.value,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].node.publicKey.value).toEqual(idA.publicKey.value);
	});
});
