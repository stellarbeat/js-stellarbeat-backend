import { Container } from 'inversify';
import Kernel from '../../../Kernel';
import { Connection } from 'typeorm';
import { NetworkMeasurementDayRepository } from '../NetworkMeasurementDayRepository';
import NetworkMeasurementDay from '../../entities/NetworkMeasurementDay';
import NetworkMeasurement from '../../entities/NetworkMeasurement';
import NetworkUpdate from '../../entities/NetworkUpdate';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';
import { NetworkMeasurementRepository } from '../NetworkMeasurementRepository';
import { ConfigMock } from '../../../__mocks__/configMock';

describe('test queries', () => {
	let container: Container;
	const kernel = new Kernel();
	let networkMeasurementDayRepository: NetworkMeasurementDayRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		await kernel.initializeContainer(new ConfigMock());
		container = kernel.container;
		networkMeasurementDayRepository = container.get(
			NetworkMeasurementDayRepository
		);
	});

	afterEach(async () => {
		await container.get(Connection).close();
	});

	test('findBetween', async () => {
		const measurement = new NetworkMeasurementDay();
		measurement.time = new Date(Date.UTC(2020, 0, 2));
		measurement.hasQuorumIntersectionCount = 5;
		await networkMeasurementDayRepository.save([measurement]);
		const from = new Date(Date.UTC(2020, 0, 1));
		const to = new Date(Date.UTC(2020, 0, 3));
		const measurements = await networkMeasurementDayRepository.findBetween(
			from,
			to
		);
		expect(measurements.length).toEqual(3);
		expect(measurements[0].time).toEqual(new Date(Date.UTC(2020, 0, 1)));
		expect(measurements[0].hasQuorumIntersectionCount).toEqual(0);
		expect(measurements[1].time).toEqual(new Date(Date.UTC(2020, 0, 2)));
		expect(measurements[1].hasQuorumIntersectionCount).toEqual(5);
		expect(measurements[2].time).toEqual(new Date(Date.UTC(2020, 0, 3)));
		expect(measurements[2].hasQuorumIntersectionCount).toEqual(0);
	});

	test('rollup', async () => {
		const crawl1 = new NetworkUpdate(new Date(Date.UTC(2020, 0, 3, 0)));
		crawl1.completed = true;
		const crawl2 = new NetworkUpdate(new Date(Date.UTC(2020, 0, 3, 1)));
		crawl2.completed = true;
		const crawl3 = new NetworkUpdate(new Date(Date.UTC(2020, 0, 3, 2)));
		crawl3.completed = true;
		crawl1.id = 1;
		crawl2.id = 2;
		crawl3.id = 3;
		const crawlRepo = container.get(NetworkUpdateRepository);
		await crawlRepo.save([crawl1, crawl2, crawl3]);
		const measurement1 = new NetworkMeasurement(crawl1.time);
		const measurement2 = new NetworkMeasurement(crawl2.time);
		const measurement3 = new NetworkMeasurement(crawl3.time);
		for (const key of Object.keys(measurement1)) {
			if (key !== 'id' && key !== 'time') {
				// @ts-ignore
				measurement1[key] = 1;
				// @ts-ignore
				measurement2[key] = 1;
				// @ts-ignore
				measurement3[key] = 1;
			}
		}
		measurement3.topTierSize = 2;

		const measurementRepo = container.get(NetworkMeasurementRepository);
		await measurementRepo.save([measurement1, measurement2]);
		await networkMeasurementDayRepository.rollup(1, 2);
		let measurements = await networkMeasurementDayRepository.findBetween(
			new Date(Date.UTC(2020, 0, 3)),
			new Date(Date.UTC(2020, 0, 3))
		);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].crawlCount).toEqual(2);
		expect(measurements[0].nrOfActiveWatchersSum).toEqual(2);
		expect(measurements[0].minBlockingSetFilteredMax).toEqual(1);

		await measurementRepo.save(measurement3);
		await networkMeasurementDayRepository.rollup(3, 3);
		measurements = await networkMeasurementDayRepository.findBetween(
			new Date(Date.UTC(2020, 0, 3)),
			new Date(Date.UTC(2020, 0, 3))
		);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].crawlCount).toEqual(3);
		expect(measurements[0].nrOfActiveWatchersSum).toEqual(3);
		expect(measurements[0].minBlockingSetFilteredMax).toEqual(1);
		expect(measurements[0].topTierMin).toEqual(1);
		expect(measurements[0].topTierMax).toEqual(2);
	});
});
