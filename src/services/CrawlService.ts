import {CrawlRepository} from "../repositories/CrawlRepository";
import * as Sentry from "@sentry/node";
import {Network} from "@stellarbeat/js-stellar-domain";

export class CrawlService {
    protected _crawlRepository:CrawlRepository;

    constructor(crawlRepository: CrawlRepository){
        this._crawlRepository = crawlRepository;
    }

    async updateStatistics(network:Network) {

        let crawlCountLast7Days = await this._crawlRepository.countLatestXDays(7);
        let crawlCountLast24Hours = await this._crawlRepository.countLatestXDays(1);

        let oneDayStatistics = await this._crawlRepository.findActivityValidatingAndLoadCountLatestXDays(1);
        let sevenDayStatistics = await this._crawlRepository.findActivityValidatingAndLoadCountLatestXDays(1);

        if(oneDayStatistics.length === 0) {
            network.nodes.forEach(node => {
                node.statistics.active24HoursPercentage = Math.round(100 *( Number(node.active) / (Number(crawlCountLast24Hours.count) + 1)));
                node.statistics.overLoaded24HoursPercentage = Math.round(100 *( Number(node.overLoaded) / (Number(crawlCountLast24Hours.count) + 1)));
                node.statistics.validating24HoursPercentage = Math.round(100 *( Number(node.isValidating) / (Number(crawlCountLast24Hours.count) + 1)));
            });
        }

        if(sevenDayStatistics.length === 0) {
            network.nodes.forEach(node => {
                node.statistics.active7DaysPercentage = Math.round(100 *( Number(node.active) / (Number(crawlCountLast7Days.count) + 1)));
                node.statistics.overLoaded7DaysPercentage = Math.round(100 *( Number(node.overLoaded) / (Number(crawlCountLast7Days.count) + 1)));
                node.statistics.validating7DaysPercentage = Math.round(100 *( Number(node.isValidating) / (Number(crawlCountLast7Days.count) + 1)));
            });
        }

        oneDayStatistics.forEach((stat: any) => { //every node has one record
            let node = network.getNodeByPublicKey(stat.publickey);
            if (node === undefined) {
                Sentry.captureException("statistics for unknown node: " + stat.publickey);
                return;
            }

            node.statistics.active24HoursPercentage = Math.round(100 * (Number(stat.activecount) + Number(node.active)) / (Number(crawlCountLast24Hours.count) + 1));
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