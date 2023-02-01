import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import NetworkMeasurement from '../../../../domain/network/NetworkMeasurement';
import NetworkScan from '../../../../domain/network/scan/NetworkScan';
import { TypeOrmNetworkScanRepository } from '../TypeOrmNetworkScanRepository';
import { TypeOrmNetworkMeasurementMonthRepository } from '../TypeOrmNetworkMeasurementMonthRepository';
import NetworkMeasurementMonth from '../../../../domain/network/NetworkMeasurementMonth';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';
import { NetworkId } from '../../../../domain/network/NetworkId';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let networkMeasurementMonthRepository: TypeOrmNetworkMeasurementMonthRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		networkMeasurementMonthRepository = container.get(
			NETWORK_TYPES.NetworkMeasurementMonthRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const measurement = new NetworkMeasurementMonth();
		measurement.time = new Date(Date.UTC(2020, 0, 2));
		measurement.hasQuorumIntersectionCount = 5;
		await networkMeasurementMonthRepository.save([measurement]);
		const from = new Date(Date.UTC(2020, 0));
		const to = new Date(Date.UTC(2020, 1));
		const measurements = await networkMeasurementMonthRepository.findBetween(
			new NetworkId('public'),
			from,
			to
		);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].time).toEqual(new Date(Date.UTC(2020, 0)));
		expect(measurements[0].hasQuorumIntersectionCount).toEqual(5);
		expect(measurements[1].time).toEqual(new Date(Date.UTC(2020, 1)));
		expect(measurements[1].hasQuorumIntersectionCount).toEqual(0);
	});

	test('rollup', async () => {
		const crawl1 = new NetworkScan(new Date(Date.UTC(2020, 0, 3, 0)));
		crawl1.completed = true;
		const crawl2 = new NetworkScan(new Date(Date.UTC(2020, 0, 3, 1)));
		crawl2.completed = true;
		const crawl3 = new NetworkScan(new Date(Date.UTC(2020, 1, 3, 2)));
		crawl3.completed = true;
		crawl1.id = 1;
		crawl2.id = 2;
		crawl3.id = 3;
		const crawlRepo = container.get<TypeOrmNetworkScanRepository>(
			NETWORK_TYPES.NetworkScanRepository
		);
		const measurement1 = new NetworkMeasurement(crawl1.time);
		crawl1.measurement = measurement1;
		const measurement2 = new NetworkMeasurement(crawl2.time);
		crawl2.measurement = measurement2;
		const measurement3 = new NetworkMeasurement(crawl3.time);
		crawl3.measurement = measurement3;
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
		await crawlRepo.save([crawl1, crawl2, crawl3]);

		await networkMeasurementMonthRepository.rollup(1, 2);
		let measurements = await networkMeasurementMonthRepository.findBetween(
			new NetworkId('public'),
			new Date(Date.UTC(2020, 0, 3)),
			new Date(Date.UTC(2020, 0, 3))
		);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].crawlCount).toEqual(2);
		expect(measurements[0].nrOfActiveWatchersSum).toEqual(2);
		expect(measurements[0].minBlockingSetFilteredMax).toEqual(1);

		await networkMeasurementMonthRepository.rollup(3, 3);
		measurements = await networkMeasurementMonthRepository.findBetween(
			new NetworkId('public'),
			new Date(Date.UTC(2020, 0, 3)),
			new Date(Date.UTC(2020, 1, 3))
		);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].crawlCount).toEqual(2);
		expect(measurements[0].nrOfActiveWatchersSum).toEqual(2);
		expect(measurements[0].minBlockingSetFilteredMax).toEqual(1);
		expect(measurements[0].topTierMin).toEqual(1);
		expect(measurements[0].topTierMax).toEqual(1);
	});
});
