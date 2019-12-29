import {Repository} from "typeorm";
import MeasurementRollup from "../entities/MeasurementRollup";
import CrawlV2 from "../entities/CrawlV2";
import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";

export default class MeasurementsRollupService {
    protected measurementRollupRepository: Repository<MeasurementRollup>;
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;

    constructor(
        measurementRollupRepository: Repository<MeasurementRollup>,
        nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository
    ) {
        this.measurementRollupRepository = measurementRollupRepository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
    }

    async initializeRollups() {
        await this.measurementRollupRepository.save([
                new MeasurementRollup("node_measurement_day_v2", "node_measurement_day_v2"),
                new MeasurementRollup("organization_measurement_day", "organization_measurement_day"),
                new MeasurementRollup("network_measurement_day", "network_measurement_day"),
                new MeasurementRollup("network_measurement_month", "network_measurement_month")
            ]
        );
    }

    async rollupNodeMeasurements(crawl: CrawlV2) {
        let nodeMeasurementDayRollup = await this.getNodeMeasurementDayRollup();
        let aggregateFromCrawlId = nodeMeasurementDayRollup.lastAggregatedCrawlId;
        aggregateFromCrawlId++;
        await this.nodeMeasurementDayV2Repository.updateCounts(aggregateFromCrawlId, crawl.id);
        nodeMeasurementDayRollup.lastAggregatedCrawlId = crawl.id;
        await this.measurementRollupRepository.save(nodeMeasurementDayRollup);
    }

    protected async getNodeMeasurementDayRollup():Promise<MeasurementRollup>{
        let nodeMeasurementDayRollup = await this.measurementRollupRepository.findOne(
            {
                where: {
                    name: "node_measurement_day_v2"
                }
            });
        if (nodeMeasurementDayRollup === undefined){
            await this.initializeRollups();
            nodeMeasurementDayRollup = await this.measurementRollupRepository.findOne(
                {
                    where: {
                        name: "node_measurement_day_v2"
                    }
                });
        }

        return nodeMeasurementDayRollup!;
    }
}