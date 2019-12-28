import {Repository} from "typeorm";
import MeasurementRollup from "../entities/MeasurementRollup";

export default class MeasurementsRollupService {
    protected measurementRollupRepository: Repository<MeasurementRollup>;

    constructor(measurementRollupRepository: Repository<MeasurementRollup>) {
        this.measurementRollupRepository = measurementRollupRepository;
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
}