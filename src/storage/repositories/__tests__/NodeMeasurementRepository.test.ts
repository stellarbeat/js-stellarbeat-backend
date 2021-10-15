import { Container } from 'inversify';
import Kernel from '../../../Kernel';
import { Connection } from 'typeorm';
import { NodeMeasurementV2Repository } from '../NodeMeasurementV2Repository';
import NodeMeasurementV2 from '../../entities/NodeMeasurementV2';
import NodePublicKeyStorage, {
	NodePublicKeyStorageRepository
} from '../../entities/NodePublicKeyStorage';
import { ConfigMock } from '../../../__mocks__/configMock';
import NetworkUpdate from '../../entities/NetworkUpdate';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';

describe('test queries', () => {
	let container: Container;
	const kernel = new Kernel();
	let crawlRepository: NetworkUpdateRepository;
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
		crawlRepository = container.get(NetworkUpdateRepository);
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

	it('should fetch node measurement events', async function () {
		const crawl1 = new NetworkUpdate(new Date('01-01-2020'));
		crawl1.completed = true;
		const crawl2 = new NetworkUpdate(new Date('02-01-2020'));
		crawl2.completed = true;
		const crawl3 = new NetworkUpdate(new Date('03-01-2020'));
		crawl3.completed = true;
		const crawl4 = new NetworkUpdate(new Date('04-01-2020'));
		crawl4.completed = true;
		await crawlRepository.save([crawl1, crawl3, crawl2, crawl4]);

		const nodePublicKeyStorageA = new NodePublicKeyStorage('a');
		const nodePublicKeyStorageB = new NodePublicKeyStorage('b');
		const nodePublicKeyStorageC = new NodePublicKeyStorage('c');
		await nodePublicKeyStorageRepository.save([
			nodePublicKeyStorageA,
			nodePublicKeyStorageB,
			nodePublicKeyStorageC
		]);

		const mA1 = new NodeMeasurementV2(crawl1.time, nodePublicKeyStorageA);
		mA1.isValidating = true;
		mA1.isFullValidator = true;
		const mA2 = new NodeMeasurementV2(crawl2.time, nodePublicKeyStorageA);
		mA2.isValidating = false;
		const mA3 = new NodeMeasurementV2(crawl3.time, nodePublicKeyStorageA);
		mA3.isValidating = false;
		const mA4 = new NodeMeasurementV2(crawl4.time, nodePublicKeyStorageA);
		mA4.isValidating = false;

		//should not detect node that is not validating longer then three crawls.
		const mB1 = new NodeMeasurementV2(crawl1.time, nodePublicKeyStorageB);
		mB1.isValidating = false;
		const mB2 = new NodeMeasurementV2(crawl2.time, nodePublicKeyStorageB);
		mB2.isValidating = false;
		const mB3 = new NodeMeasurementV2(crawl3.time, nodePublicKeyStorageB);
		mB3.isValidating = false;
		const mB4 = new NodeMeasurementV2(crawl4.time, nodePublicKeyStorageB);
		mB4.isValidating = false;

		const mC1 = new NodeMeasurementV2(crawl1.time, nodePublicKeyStorageC);
		mC1.isValidating = false;
		mC1.isActive = true;
		const mC2 = new NodeMeasurementV2(crawl2.time, nodePublicKeyStorageC);
		mC2.isValidating = true;
		const mC3 = new NodeMeasurementV2(crawl3.time, nodePublicKeyStorageC);
		mC3.isValidating = false;
		const mC4 = new NodeMeasurementV2(crawl4.time, nodePublicKeyStorageC);
		mC4.isValidating = false;

		await nodeMeasurementV2Repository.save([
			mA1,
			mA2,
			mA3,
			mA4,
			mB1,
			mB2,
			mB3,
			mB4,
			mC1,
			mC2,
			mC3,
			mC4
		]);

		const events =
			await nodeMeasurementV2Repository.findNodeMeasurementEventsInXLatestNetworkUpdates(
				3
			);
		expect(events).toHaveLength(2);
		const eventA = events.find(
			(event) => event.publicKey === nodePublicKeyStorageA.publicKey
		);
		expect(eventA).toBeDefined();
		if (!eventA) return;
		expect(eventA.inactive).toBeFalsy();
		expect(eventA.notValidating).toBeTruthy();
		expect(eventA.historyOutOfDate).toBeTruthy();

		const eventC = events.find(
			(event) => event.publicKey === nodePublicKeyStorageC.publicKey
		);
		expect(eventC).toBeDefined();
		if (!eventC) return;
		expect(eventC.inactive).toBeTruthy();
		expect(eventC.notValidating).toBeFalsy();
		expect(eventC.historyOutOfDate).toBeFalsy();
	});
});
