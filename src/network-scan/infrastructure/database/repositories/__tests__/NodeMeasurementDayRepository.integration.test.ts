import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { NodeMeasurementDayRepository } from '../../../../domain/node/NodeMeasurementDayRepository';
import NodeMeasurementDay from '../../../../domain/node/NodeMeasurementDay';
import { createDummyNode } from '../../../../domain/node/__fixtures__/createDummyNode';
import { NodeRepository } from '../../../../domain/node/NodeRepository';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeMeasurementDayRepository: NodeMeasurementDayRepository;
	let nodeRepository: NodeRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeMeasurementDayRepository = container.get<NodeMeasurementDayRepository>(
			NETWORK_TYPES.NodeMeasurementDayRepository
		);
		nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const idA = createDummyNode();
		const idB = createDummyNode();
		await nodeRepository.save([idA, idB]);
		await nodeMeasurementDayRepository.save([
			new NodeMeasurementDay(idA, '12/12/2020'),
			new NodeMeasurementDay(idB, '12/12/2020'),
			new NodeMeasurementDay(idA, '12/13/2020'),
			new NodeMeasurementDay(idB, '12/13/2020')
		]);

		const measurements = await nodeMeasurementDayRepository.findBetween(
			idA.publicKey,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);
		expect(measurements.length).toEqual(2);
	});

	test('findXDaysAverageAt', async () => {
		const idA = createDummyNode();
		await nodeRepository.save([idA]);
		const a = new NodeMeasurementDay(idA, '12/12/2020');
		a.crawlCount = 2;
		a.isValidatingCount = 2;
		const b = new NodeMeasurementDay(idA, '12/13/2020');
		b.crawlCount = 2;
		b.isValidatingCount = 2;
		await nodeMeasurementDayRepository.save([a, b]);

		const averages = await nodeMeasurementDayRepository.findXDaysAverageAt(
			new Date('12/13/2020'),
			2
		);
		expect(averages.length).toEqual(1);
		expect(averages[0].validatingAvg).toEqual(100);
		expect(averages[0].publicKey).toEqual(idA.publicKey.value);
	});
});
