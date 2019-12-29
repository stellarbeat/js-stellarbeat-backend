import {Repository} from "typeorm";
import MeasurementRollup from "../entities/MeasurementRollup";
import CrawlV2 from "../entities/CrawlV2";
import {
    IMeasurementRollupRepository,
    NodeMeasurementDayV2Repository
} from "../repositories/NodeMeasurementDayV2Repository";
import {OrganizationMeasurementDayRepository} from "../repositories/OrganizationMeasurementDayRepository";

export default class MeasurementsRollupService {
    protected measurementRollupRepository: Repository<MeasurementRollup>;
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository;

    constructor(
        measurementRollupRepository: Repository<MeasurementRollup>,
        nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
        organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository
    ) {
        this.measurementRollupRepository = measurementRollupRepository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.organizationMeasurementsDayRepository = organizationMeasurementsDayRepository;
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
        await this.rollupNodeMeasurements(crawl);
        await this.rollupOrganizationMeasurements(crawl);
    }

    async rollupNodeMeasurements(crawl: CrawlV2) {
        await this.performRollup(crawl, MeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP, this.nodeMeasurementDayV2Repository);
    }

    async rollupOrganizationMeasurements(crawl: CrawlV2) {
        await this.performRollup(crawl, MeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP, this.organizationMeasurementsDayRepository);
    }

    protected async performRollup(crawl: CrawlV2, name: string, repository: IMeasurementRollupRepository) {
        let measurementRollup = await this.getMeasurementsRollup(name);
        let aggregateFromCrawlId = measurementRollup.lastAggregatedCrawlId;
        aggregateFromCrawlId++;
        await repository.updateCounts(aggregateFromCrawlId, crawl.id);
        measurementRollup.lastAggregatedCrawlId = crawl.id;
        await this.measurementRollupRepository.save(measurementRollup);
    }

    protected async getMeasurementsRollup(name: string): Promise<MeasurementRollup> {
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