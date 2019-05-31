import {NodeMeasurementRepository} from "../repositories/NodeMeasurementRepository";
import * as Sentry from "@sentry/node";
import {Network} from "@stellarbeat/js-stellar-domain";
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

    async updateStatistics(network:Network, crawl:Crawl) {
        await Promise.all(network.nodes.map(async node => {
            try {
                let nodeMeasurement = new NodeMeasurement(node.publicKey, crawl.time);
                nodeMeasurement.isActive = node.active;
                nodeMeasurement.isOverLoaded = node.overLoaded;
                nodeMeasurement.isValidating = node.isValidating;

                await this._nodeMeasurementRepository.save(nodeMeasurement);
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));

        let crawlCountLast7Days = await this._crawlRepository.countLatestXDays(7);
        console.log(crawlCountLast7Days);
        let crawlCountLast24Hours = await this._crawlRepository.countLatestXDays(1);
        console.log(crawlCountLast24Hours);
        let oneDayStatistics = await this._nodeMeasurementRepository.findActivityValidatingAndLoadCountLatestXDays(1);
        console.log(oneDayStatistics);
        let sevenDayStatistics = await this._nodeMeasurementRepository.findActivityValidatingAndLoadCountLatestXDays(1);
        console.log(sevenDayStatistics);

        oneDayStatistics.forEach((stat: any) => { //every node has at least one record
            let node = network.getNodeByPublicKey(stat.publickey);
            if (node === undefined) {
                Sentry.captureException("statistics for unknown node: " + stat.publickey);
                return;
            }

            node.statistics.active24HoursPercentage = (100 * (Number(stat.activecount) + Number(node.active)) / (Number(crawlCountLast24Hours.count) + 1));
            node.statistics.overLoaded24HoursPercentage = Math.round(100 * (Number(stat.overloadedcount) + Number(node.overLoaded) )/ (Number(crawlCountLast24Hours.count) + 1));
            node.statistics.validating24HoursPercentage = Math.round(100 * (Number(stat.validatingcount) + Number(node.isValidating)) / (Number(crawlCountLast24Hours.count) + 1));
        });

        sevenDayStatistics.forEach((stat: any) => {//every node has one record
            let node = network.getNodeByPublicKey(stat.publickey);
            if (node === undefined) {
                Sentry.captureException("statistics for unknown node: " + stat.publickey);
                return;
            }
            node.statistics.active7DaysPercentage = Math.round(100 * (Number(stat.activecount) + Number(node.active) )/ (Number(crawlCountLast7Days.count) + 1));
            node.statistics.overLoaded7DaysPercentage = Math.round(100 * (Number(stat.overloadedcount) + Number(node.overLoaded) )/ (Number(crawlCountLast7Days.count) + 1));
            node.statistics.validating7DaysPercentage = Math.round(100 * (Number(stat.validatingcount) + Number(node.isValidating) )/ (Number(crawlCountLast7Days.count) + 1));
        });
    }
}