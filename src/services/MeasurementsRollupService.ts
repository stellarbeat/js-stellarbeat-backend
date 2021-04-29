import {Repository} from "typeorm";
import MeasurementRollup from "../entities/MeasurementRollup";
import CrawlV2 from "../entities/CrawlV2";
import {
    IMeasurementRollupRepository,
    NodeMeasurementDayV2Repository
} from "../repositories/NodeMeasurementDayV2Repository";
import {OrganizationMeasurementDayRepository} from "../repositories/OrganizationMeasurementDayRepository";
import {NetworkMeasurementDayRepository} from "../repositories/NetworkMeasurementDayRepository";
import {inject, injectable} from "inversify";
import {NetworkMeasurementMonthRepository} from "../repositories/NetworkMeasurementMonthRepository";

@injectable()
export default class MeasurementsRollupService {
    protected measurementRollupRepository: Repository<MeasurementRollup>;
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository;
    protected networkMeasurementsDayRepository: NetworkMeasurementDayRepository;
    protected networkMeasurementsMonthRepository: NetworkMeasurementMonthRepository;

    constructor(
        @inject('Repository<MeasurementRollup>') measurementRollupRepository: Repository<MeasurementRollup>,
        nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
        organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository,
        networkMeasurementsDayRepository: NetworkMeasurementDayRepository,
        networkMeasurementMonthRepository: NetworkMeasurementMonthRepository
    ) {
        this.measurementRollupRepository = measurementRollupRepository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.organizationMeasurementsDayRepository = organizationMeasurementsDayRepository;
        this.networkMeasurementsDayRepository = networkMeasurementsDayRepository;
        this.networkMeasurementsMonthRepository = networkMeasurementMonthRepository;
    }

    static readonly NODE_MEASUREMENTS_DAY_ROLLUP = "node_measurement_day_v2";
    static readonly ORGANIZATION_MEASUREMENTS_DAY_ROLLUP = "organization_measurement_day";
    static readonly NETWORK_MEASUREMENTS_DAY_ROLLUP = "network_measurement_day";
    static readonly NETWORK_MEASUREMENTS_MONTH_ROLLUP = "network_measurement_month";

    async initializeRollups() {
        await this.measurementRollupRepository.save([
                new MeasurementRollup(MeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP, "node_measurement_day_v2"),
                new MeasurementRollup(MeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP, "organization_measurement_day"),
                new MeasurementRollup(MeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP, "network_measurement_day"),
                new MeasurementRollup(MeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP, "network_measurement_month")
            ]
        );
    }

    async rollupMeasurements(crawl: CrawlV2) {
        console.time('nodeRollup');
        await this.rollupNodeMeasurements(crawl);
        console.timeEnd('nodeRollup');
        console.time('orgRollup');
        await this.rollupOrganizationMeasurements(crawl);
        console.timeEnd('orgRollup');
        console.time('networkRollup');
        await this.rollupNetworkMeasurements(crawl);
        console.timeEnd('networkRollup');
    }

    async rollupNodeMeasurements(crawl: CrawlV2) {
        await this.performRollup(crawl, MeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP, this.nodeMeasurementDayV2Repository);
    }

    async rollupOrganizationMeasurements(crawl: CrawlV2) {
        await this.performRollup(crawl, MeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP, this.organizationMeasurementsDayRepository);
    }

    async rollupNetworkMeasurements(crawl: CrawlV2) {
        await this.performRollup(crawl, MeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP, this.networkMeasurementsDayRepository);
        await this.performRollup(crawl, MeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP, this.networkMeasurementsMonthRepository);
    }

    async rollbackNetworkMeasurements(from: Date){
        await this.networkMeasurementsDayRepository.deleteFrom(from);
        await this.networkMeasurementsMonthRepository.deleteFrom(from);
    }

    protected async performRollup(crawl: CrawlV2, name: string, repository: IMeasurementRollupRepository) {
        let measurementRollup = await this.getMeasurementsRollup(name);
        let aggregateFromCrawlId = measurementRollup.lastAggregatedCrawlId;
        aggregateFromCrawlId++;
        await repository.rollup(aggregateFromCrawlId, crawl.id);
        measurementRollup.lastAggregatedCrawlId = crawl.id;
        await this.measurementRollupRepository.save(measurementRollup);
    }

    public async getMeasurementsRollup(name: string): Promise<MeasurementRollup> {
        let measurementRollup = await this.measurementRollupRepository.findOne(
            {
                where: {
                    name: name
                }
            });
        if (measurementRollup === undefined) {
            await this.initializeRollups();
            measurementRollup = await this.measurementRollupRepository.findOne(
                {
                    where: {
                        name: name
                    }
                });
        }

        return measurementRollup!;
    }
}