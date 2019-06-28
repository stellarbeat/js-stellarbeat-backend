import {NodeMeasurementRepository} from "../repositories/NodeMeasurementRepository";
import {Network, Organization} from "@stellarbeat/js-stellar-domain";
import {CrawlRepository} from "../repositories/CrawlRepository";
import NodeMeasurement from "../entities/NodeMeasurement";
import Crawl from "../entities/Crawl";

export class StatisticsService {
    protected _nodeMeasurementRepository:NodeMeasurementRepository;
    protected _crawlRepository: CrawlRepository;

    constructor(nodeMeasurementRepository: NodeMeasurementRepository,
                crawlRepository: CrawlRepository){
        this._nodeMeasurementRepository = nodeMeasurementRepository;
        this._crawlRepository = crawlRepository;
    }

    async saveMeasurementsAndUpdateAverages(network:Network, crawl:Crawl) {
        let nodeMeasurements = network.nodes.map(node => {
                let nodeMeasurement = new NodeMeasurement(node.publicKey, crawl.time);
                nodeMeasurement.isActive = node.active;
                nodeMeasurement.isOverLoaded = node.overLoaded;
                nodeMeasurement.isValidating = node.isValidating;

                return nodeMeasurement;
        });

        await this._nodeMeasurementRepository.save(nodeMeasurements);

        let oneDayAverages = await this._nodeMeasurementRepository.findActivityValidatingAndLoadCountLatestXDays(1);
        let sevenDayAverages = await this._nodeMeasurementRepository.findActivityValidatingAndLoadCountLatestXDays(30);

        oneDayAverages.forEach((measurementAverage) => { //every node has at least one record
            let node = network.getNodeByPublicKey(measurementAverage.public_key);
            if (node === undefined) {
                return;
            }

            node.statistics.active24HoursPercentage = Number(measurementAverage.active_avg);
            node.statistics.overLoaded24HoursPercentage =  Number(measurementAverage.over_loaded_avg);
            node.statistics.validating24HoursPercentage =  Number(measurementAverage.validating_avg);
        });

        sevenDayAverages.forEach((measurementAverage) => {//every node has one record
            let node = network.getNodeByPublicKey(measurementAverage.public_key);
            if (node === undefined) {
                return;
            }

            node.statistics.active30DaysPercentage = Number(measurementAverage.active_avg);
            node.statistics.overLoaded30DaysPercentage =  Number(measurementAverage.over_loaded_avg);
            node.statistics.validating30DaysPercentage =  Number(measurementAverage.validating_avg);
        });

        await this.updateOrganizationsAvailability(network.organizations);
    }

    async updateOrganizationsAvailability(organizations:Organization[]){
        for(let organizationIndex in organizations) {
            let organization = organizations[organizationIndex];
            let availability24HoursResult =
                await this._nodeMeasurementRepository.findValidatorClusterAvailabilityLatestXDays(1, organizations[organizationIndex].validators, organization.subQuorumThreshold);
            let availability30DaysResult =
                await this._nodeMeasurementRepository.findValidatorClusterAvailabilityLatestXDays(30, organizations[organizationIndex].validators, organization.subQuorumThreshold);
console.log(availability30DaysResult);

            organization.subQuorum30DaysAvailability = availability30DaysResult;
            organization.subQuorum24HoursAvailability = availability24HoursResult;
        }
    }
}