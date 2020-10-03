import {Container} from "inversify";
import Kernel from "../../src/Kernel";
import {Connection} from "typeorm";
import {NetworkMeasurementDayRepository} from "../../src/repositories/NetworkMeasurementDayRepository";
import NetworkMeasurementDay from "../../src/entities/NetworkMeasurementDay";
import NetworkMeasurement from "../../src/entities/NetworkMeasurement";
import CrawlV2 from "../../src/entities/CrawlV2";
import {CrawlV2Repository} from "../../src/repositories/CrawlV2Repository";
import {NetworkMeasurementRepository} from "../../src/repositories/NetworkMeasurementRepository";

describe('test queries', () => {
    let container: Container;
    let kernel = new Kernel();
    let networkMeasurementDayRepository: NetworkMeasurementDayRepository;
    jest.setTimeout(60000); //slow integration tests

    beforeEach(async () => {
        await kernel.initializeContainer();
        container = kernel.container;
        networkMeasurementDayRepository = container.get(NetworkMeasurementDayRepository);
    })

    afterEach(async () => {
        await container.get(Connection).close();
    });

    test('findBetween', async () => {
        let measurement = new NetworkMeasurementDay();
        measurement.time = new Date(Date.UTC(2020,0,2));
        measurement.hasQuorumIntersectionCount = 5;
        await networkMeasurementDayRepository.save([measurement]);
        let from = new Date(Date.UTC(2020, 0, 1));
        let to = new Date(Date.UTC(2020, 0, 3))
        let measurements = await networkMeasurementDayRepository.findBetween(from, to);
        console.log(measurements);
        expect(measurements.length).toEqual(3);
        expect(measurements[0].time).toEqual(new Date(Date.UTC(2020, 0, 1)));
        expect(measurements[0].hasQuorumIntersectionCount).toEqual(0);
        expect(measurements[1].time).toEqual(new Date(Date.UTC(2020, 0, 2)));
        expect(measurements[1].hasQuorumIntersectionCount).toEqual(5);
        expect(measurements[2].time).toEqual(new Date(Date.UTC(2020, 0, 3)));
        expect(measurements[2].hasQuorumIntersectionCount).toEqual(0);
    });

    test('rollup', async () => {
        let crawl1 = new CrawlV2(new Date(Date.UTC(2020, 0, 3, 0)));
        crawl1.completed = true;
        let crawl2 = new CrawlV2(new Date(Date.UTC(2020, 0, 3, 1)));
        crawl2.completed = true;
        let crawl3 = new CrawlV2(new Date(Date.UTC(2020, 0, 3, 2)));
        crawl3.completed = true;
        crawl1.id = 1;
        crawl2.id = 2;
        crawl3.id = 3;
        let crawlRepo = container.get(CrawlV2Repository);
        await crawlRepo.save([crawl1, crawl2, crawl3]);
        let measurement1 = new NetworkMeasurement(crawl1.time);
        let measurement2 = new NetworkMeasurement(crawl2.time);
        let measurement3 = new NetworkMeasurement(crawl3.time);
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

        let measurementRepo = container.get(NetworkMeasurementRepository);
        await measurementRepo.save([measurement1, measurement2]);
        await networkMeasurementDayRepository.rollup(1, 2);
        let measurements = await networkMeasurementDayRepository.findBetween(new Date(Date.UTC(2020, 0, 3)), new Date(Date.UTC(2020, 0, 3)));
        expect(measurements.length).toEqual(1);
        expect(measurements[0].crawlCount).toEqual(2);
        expect(measurements[0].nrOfActiveWatchersSum).toEqual(2);
        expect(measurements[0].minBlockingSetFilteredMax).toEqual(1);

        await measurementRepo.save(measurement3);
        await networkMeasurementDayRepository.rollup(3, 3);
        measurements = await networkMeasurementDayRepository.findBetween(new Date(Date.UTC(2020, 0, 3)), new Date(Date.UTC(2020, 0, 3)));
        expect(measurements.length).toEqual(1);
        expect(measurements[0].crawlCount).toEqual(3);
        expect(measurements[0].nrOfActiveWatchersSum).toEqual(3);
        expect(measurements[0].minBlockingSetFilteredMax).toEqual(1);
        expect(measurements[0].topTierMin).toEqual(1);
        expect(measurements[0].topTierMax).toEqual(2);
    })
})
