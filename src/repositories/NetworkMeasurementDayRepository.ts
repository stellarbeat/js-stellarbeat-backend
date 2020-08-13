import {EntityRepository, Repository} from "typeorm";
import {IMeasurementRollupRepository} from "./NodeMeasurementDayV2Repository";
import NetworkMeasurementDay from "../entities/NetworkMeasurementDay";
import {injectable} from "inversify";

export interface NetworkMeasurementStatisticsRecord {
    day: string;
    nrOfActiveNodesSum: string;
    nrOfValidatorsSum: string;
    nrOfFullValidatorsSum: string;
    nrOfOrganizationsSum: string;
    transitiveQuorumSetSizeSum: string;
    hasQuorumIntersectionCount: string;
    hasQuorumIntersectionFilteredCount: string;
    topTierSizeSum: string;
    topTierSizeFilteredSum: string;
    topTierSizeOrgsSum: string;
    topTierSizeOrgsFilteredSum: string;
    minBlockingSetSizeSum: string;
    minBlockingSetOrgsSizeSum: string;
    minBlockingSetFilteredSizeSum: string;
    minBlockingSetOrgsFilteredSizeSum: string;
    minSplittingSetSizeSum: string;
    minSplittingSetOrgsSizeSum: string;
    minSplittingSetFilteredSizeSum: string;
    minSplittingSetOrgsFilteredSizeSum: string;
    crawlCount: string;
}

export class NetworkMeasurementStatistics {
    day: Date = new Date();
    nrOfActiveNodesSum: number = 0;
    nrOfValidatorsSum: number = 0;
    nrOfFullValidatorsSum: number = 0;
    nrOfOrganizationsSum: number = 0;
    transitiveQuorumSetSizeSum: number = 0;
    hasQuorumIntersectionCount: number = 0;
    hasQuorumIntersectionFilteredCount: number = 0;
    topTierSizeSum: number = 0;
    topTierSizeFilteredSum: number = 0;
    topTierSizeOrgsSum: number = 0;
    topTierSizeOrgsFilteredSum: number = 0;
    minBlockingSetSizeSum: number = 0;
    minBlockingSetOrgsSizeSum: number = 0;
    minBlockingSetFilteredSizeSum: number = 0;
    minBlockingSetOrgsFilteredSizeSum: number = 0;
    minSplittingSetSizeSum: number = 0;
    minSplittingSetOrgsSizeSum: number = 0;
    minSplittingSetFilteredSizeSum: number = 0;
    minSplittingSetOrgsFilteredSizeSum: number = 0;
    crawlCount: number = 0;

    static fromDatabaseRecord(record: NetworkMeasurementStatisticsRecord){
        let stat = new this();
        stat.day = new Date(record.day);
        stat.nrOfActiveNodesSum = Number(record.nrOfActiveNodesSum);
        stat.nrOfValidatorsSum = Number(record.nrOfValidatorsSum);
        stat.nrOfFullValidatorsSum = Number(record.nrOfFullValidatorsSum);
        stat.nrOfOrganizationsSum = Number(record.nrOfOrganizationsSum);
        stat.transitiveQuorumSetSizeSum = Number(record.transitiveQuorumSetSizeSum);
        stat.hasQuorumIntersectionCount = Number(record.hasQuorumIntersectionCount);
        stat.hasQuorumIntersectionFilteredCount = Number(record.hasQuorumIntersectionFilteredCount);
        stat.topTierSizeSum = Number(record.topTierSizeSum);
        stat.topTierSizeFilteredSum = Number(record.topTierSizeFilteredSum);
        stat.topTierSizeOrgsSum = Number(record.topTierSizeOrgsSum);
        stat.topTierSizeOrgsFilteredSum = Number(record.topTierSizeOrgsFilteredSum);
        stat.minBlockingSetSizeSum = Number(record.minBlockingSetSizeSum);
        stat.minBlockingSetOrgsSizeSum = Number(record.minBlockingSetOrgsSizeSum);
        stat.minBlockingSetFilteredSizeSum = Number(record.minBlockingSetFilteredSizeSum);
        stat.minBlockingSetOrgsFilteredSizeSum = Number(record.minBlockingSetOrgsFilteredSizeSum);
        stat.minSplittingSetSizeSum = Number(record.minSplittingSetSizeSum);
        stat.minSplittingSetOrgsSizeSum = Number(record.minSplittingSetOrgsSizeSum);
        stat.minSplittingSetFilteredSizeSum = Number(record.minSplittingSetFilteredSizeSum);
        stat.minSplittingSetOrgsFilteredSizeSum = Number(record.minSplittingSetOrgsFilteredSizeSum)
        stat.crawlCount = Number(record.crawlCount);

        return stat;
    }
}

@injectable()
@EntityRepository(NetworkMeasurementDay)
export class NetworkMeasurementDayRepository extends Repository<NetworkMeasurementDay> implements IMeasurementRollupRepository{

    async findBetween(from: Date, to: Date):Promise<NetworkMeasurementStatistics[]> {
        let result = await this.query('with measurements as (\n' +
            '    SELECT "NetworkMeasurementDay"."day",\n' +
            '           "NetworkMeasurementDay"."nrOfActiveNodesSum",\n' +
            '           "NetworkMeasurementDay"."nrOfValidatorsSum",\n' +
            '           "NetworkMeasurementDay"."nrOfFullValidatorsSum",\n' +
            '           "NetworkMeasurementDay"."nrOfOrganizationsSum",\n' +
            '           "NetworkMeasurementDay"."transitiveQuorumSetSizeSum",\n' +
            '           "NetworkMeasurementDay"."hasQuorumIntersectionCount",\n' +
            '           "NetworkMeasurementDay"."hasQuorumIntersectionFilteredCount",\n' +
            '           "NetworkMeasurementDay"."topTierSizeSum",\n' +
            '           "NetworkMeasurementDay"."topTierSizeFilteredSum",\n' +
            '           "NetworkMeasurementDay"."topTierSizeOrgsSum",\n' +
            '           "NetworkMeasurementDay"."topTierSizeOrgsFilteredSum",\n' +
            '           "NetworkMeasurementDay"."minBlockingSetSizeSum",\n' +
            '           "NetworkMeasurementDay"."minBlockingSetOrgsSizeSum",\n' +
            '           "NetworkMeasurementDay"."minBlockingSetFilteredSizeSum",\n' +
            '           "NetworkMeasurementDay"."minBlockingSetOrgsFilteredSizeSum",\n' +
            '           "NetworkMeasurementDay"."minSplittingSetSizeSum",\n' +
            '           "NetworkMeasurementDay"."minSplittingSetOrgsSizeSum",\n' +
            '           "NetworkMeasurementDay"."minSplittingSetFilteredSizeSum",\n' +
            '           "NetworkMeasurementDay"."minSplittingSetOrgsFilteredSizeSum",\n' +
            '           "NetworkMeasurementDay"."crawlCount"\n' +
            '    FROM "network_measurement_day" "NetworkMeasurementDay"\n' +
            '    WHERE "day" >= date_trunc(\'day\', $2::timestamp)\n' +
            '      and "day" <= date_trunc(\'day\', $3::timestamp)\n' +
            ') select d.day, \n' +
            'coalesce("crawlCount",0) "crawlCount",\n' +
            'coalesce("crawlCount",0) "nrOfActiveNodesSum",\n' +
            'coalesce("crawlCount",0) "nrOfValidatorsSum",\n' +
            'coalesce("crawlCount",0) "nrOfFullValidatorsSum",\n' +
            'coalesce("crawlCount",0) "nrOfOrganizationsSum",\n' +
            'coalesce("crawlCount",0) "transitiveQuorumSetSizeSum",\n' +
            'coalesce("crawlCount",0) "topTierSizeOrgsFilteredSum",\n' +
            'coalesce("crawlCount",0) "hasQuorumIntersectionFilteredCount",\n' +
            'coalesce("crawlCount",0) "topTierSizeSum",\n' +
            'coalesce("crawlCount",0) "topTierSizeFilteredSum",\n' +
            'coalesce("crawlCount",0) "topTierSizeOrgsSum",\n' +
            'coalesce("crawlCount",0) "hasQuorumIntersectionCount",\n' +
            'coalesce("crawlCount",0) "minBlockingSetSizeSum",\n' +
            'coalesce("crawlCount",0) "minBlockingSetOrgsSizeSum",\n' +
            'coalesce("crawlCount",0) "minBlockingSetFilteredSizeSum",\n' +
            'coalesce("crawlCount",0) "minBlockingSetOrgsFilteredSizeSum",\n' +
            'coalesce("crawlCount",0) "minSplittingSetSizeSum",\n' +
            'coalesce("crawlCount",0) "minSplittingSetOrgsSizeSum",\n' +
            'coalesce("crawlCount",0) "minSplittingSetFilteredSizeSum",\n' +
            'coalesce("crawlCount",0) "minSplittingSetOrgsFilteredSizeSum",\n' +
            'coalesce("crawlCount",0) "crawlCount"\n' +
            'from (select generate_series( date_trunc(\'day\', $2::TIMESTAMP), date_trunc(\'day\', $3::TIMESTAMP), interval \'1 day\')) d(day)\n' +
            '        LEFT OUTER JOIN measurements on d.day = measurements.day\n',
            [from, to]);

        return result.map((record:NetworkMeasurementStatisticsRecord) => NetworkMeasurementStatistics.fromDatabaseRecord(record));
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO network_measurement_day (day, \"nrOfActiveNodesSum\", \"nrOfValidatorsSum\", \"nrOfFullValidatorsSum\", \"nrOfOrganizationsSum\", \"transitiveQuorumSetSizeSum\", \"hasQuorumIntersectionCount\", \"hasQuorumIntersectionFilteredCount\", \"topTierSizeSum\", \"topTierSizeFilteredSum\", \"topTierSizeOrgsSum\", \"topTierSizeOrgsFilteredSum\", \"minBlockingSetSizeSum\", \"minBlockingSetOrgsSizeSum\", \"minBlockingSetFilteredSizeSum\", \"minBlockingSetOrgsFilteredSizeSum\", \"minSplittingSetSizeSum\", \"minSplittingSetOrgsSizeSum\", \"minSplittingSetFilteredSizeSum\", \"minSplittingSetOrgsFilteredSizeSum\", \"crawlCount\")\n" +
            "    with crawls as (\n" +
            "        select date_trunc('day', \"Crawl\".\"time\") \"crawlDay\", count(distinct \"Crawl2\".id) \"crawlCount\"\n" +
            "        from  crawl_v2 \"Crawl\"\n" +
            "        join crawl_v2 \"Crawl2\" on date_trunc('day', \"Crawl\".\"time\") = date_trunc('day', \"Crawl2\".\"time\") AND \"Crawl2\".completed = true\n" +
            "        WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "        group by \"crawlDay\"\n" +
            "    )\n" +
            "select date_trunc('day', \"CrawlV2\".\"time\") \"day\",\n" +
            "       sum(\"nrOfActiveNodes\"::int) \"nrOfActiveNodesSum\",\n" +
            "       sum(\"nrOfValidators\"::int) \"nrOfValidatorsSum\",\n" +
            "       sum(\"nrOfFullValidators\"::int) \"nrOfFullValidatorsSum\",\n" +
            "       sum(\"nrOfOrganizations\"::int) \"nrOfOrganizationsSum\",\n" +
            "       sum(\"transitiveQuorumSetSize\"::int) \"transitiveQuorumSetSizeSum\",\n" +
            "       sum(\"hasQuorumIntersectionCount\"::int) \"hasQuorumIntersectionCount\",\n" +
            "       sum(\"hasQuorumIntersectionFilteredCount\"::int) \"hasQuorumIntersectionFilteredCount\",\n" +
            "       sum(\"topTierSizeSum\"::int) \"topTierSizeSum\",\n" +
            "       sum(\"topTierSizeFilteredSum\"::int) \"topTierSizeFilteredSum\",\n" +
            "       sum(\"topTierSizeOrgsSum\"::int) \"topTierSizeOrgsSum\",\n" +
            "       sum(\"topTierSizeOrgsFilteredSum\"::int) \"topTierSizeOrgsFilteredSum\",\n" +
            "       sum(\"minBlockingSetSizeSum\"::int) \"minBlockingSetSizeSum\",\n" +
            "       sum(\"minBlockingSetOrgsSizeSum\"::int) \"minBlockingSetOrgsSizeSum\",\n" +
            "       sum(\"minBlockingSetFilteredSizeSum\"::int) \"minBlockingSetFilteredSizeSum\",\n" +
            "       sum(\"minBlockingSetOrgsFilteredSizeSum\"::int) \"minBlockingSetOrgsFilteredSizeSum\",\n" +
            "       sum(\"minSplittingSetSizeSum\"::int) \"minSplittingSetSizeSum\",\n" +
            "       sum(\"minSplittingSetOrgsSizeSum\"::int) \"minSplittingSetOrgsSizeSum\",\n" +
            "       sum(\"minSplittingSetFilteredSizeSum\"::int) \"minSplittingSetFilteredSizeSum\",\n" +
            "       sum(\"minSplittingSetOrgsFilteredSizeSum\"::int) \"minSplittingSetOrgsFilteredSizeSum\",\n" +
            "       \"crawls\".\"crawlCount\" \"crawlCount\"\n" +
            '    FROM "crawl_v2" "CrawlV2"' +
            "             join crawls on crawls.\"crawlDay\" = date_trunc('day', \"CrawlV2\".\"time\")\n" +
            "join network_measurement on network_measurement.\"crawlId\" = \"CrawlV2\".id\n" +
            "    WHERE \"CrawlV2\".id BETWEEN $1 AND $2 AND \"CrawlV2\".completed = true\n" +
            "group by day, \"crawlCount\"\n" +
            "ON CONFLICT (day) DO UPDATE\n" +
            "SET\n" +
            "    \"nrOfActiveNodesSum\" = network_measurement_day.\"nrOfActiveNodesSum\" + EXCLUDED.\"nrOfActiveNodesSum\",\n" +
            "    \"nrOfValidatorsSum\" = network_measurement_day.\"nrOfValidatorsSum\" + EXCLUDED.\"nrOfValidatorsSum\",\n" +
            "    \"nrOfFullValidatorsSum\" = network_measurement_day.\"nrOfFullValidatorsSum\" + EXCLUDED.\"nrOfFullValidatorsSum\",\n" +
            "    \"nrOfOrganizationsSum\" = network_measurement_day.\"nrOfOrganizationsSum\" + EXCLUDED.\"nrOfOrganizationsSum\",\n" +
            "    \"transitiveQuorumSetSizeSum\" = network_measurement_day.\"transitiveQuorumSetSizeSum\" + EXCLUDED.\"transitiveQuorumSetSizeSum\",\n" +
            "    \"hasQuorumIntersectionCount\" = network_measurement_day.\"hasQuorumIntersectionCount\" + EXCLUDED.\"hasQuorumIntersectionCount\",\n" +
            "    \"hasQuorumIntersectionFilteredCount\" = network_measurement_day.\"hasQuorumIntersectionFilteredCount\" + EXCLUDED.\"hasQuorumIntersectionFilteredCount\",\n" +
            "    \"topTierSizeSum\" = network_measurement_day.\"topTierSizeSum\" + EXCLUDED.\"topTierSizeSum\",\n" +
            "    \"topTierSizeFilteredSum\" = network_measurement_day.\"topTierSizeFilteredSum\" + EXCLUDED.\"topTierSizeFilteredSum\",\n" +
            "    \"topTierSizeOrgsSum\" = network_measurement_day.\"topTierSizeOrgsSum\" + EXCLUDED.\"topTierSizeOrgsSum\",\n" +
            "    \"topTierSizeOrgsFilteredSum\" = network_measurement_day.\"topTierSizeOrgsFilteredSum\" + EXCLUDED.\"topTierSizeOrgsFilteredSum\",\n" +
            "    \"minBlockingSetSizeSum\" = network_measurement_day.\"minBlockingSetSizeSum\" + EXCLUDED.\"minBlockingSetSizeSum\",\n" +
            "    \"minBlockingSetOrgsSizeSum\" = network_measurement_day.\"minBlockingSetOrgsSizeSum\" + EXCLUDED.\"minBlockingSetOrgsSizeSum\",\n" +
            "    \"minBlockingSetFilteredSizeSum\" = network_measurement_day.\"minBlockingSetFilteredSizeSum\" + EXCLUDED.\"minBlockingSetFilteredSizeSum\",\n" +
            "    \"minBlockingSetOrgsFilteredSizeSum\" = network_measurement_day.\"minBlockingSetOrgsFilteredSizeSum\" + EXCLUDED.\"minBlockingSetOrgsFilteredSizeSum\",\n" +
            "    \"minSplittingSetSizeSum\" = network_measurement_day.\"minSplittingSetSizeSum\" + EXCLUDED.\"minSplittingSetSizeSum\",\n" +
            "    \"minSplittingSetOrgsSizeSum\" = network_measurement_day.\"minSplittingSetOrgsSizeSum\" + EXCLUDED.\"minSplittingSetOrgsSizeSum\",\n" +
            "    \"minSplittingSetFilteredSizeSum\" = network_measurement_day.\"minSplittingSetFilteredSizeSum\" + EXCLUDED.\"minSplittingSetFilteredSizeSum\",\n" +
            "    \"minSplittingSetOrgsFilteredSizeSum\" = network_measurement_day.\"minSplittingSetOrgsFilteredSizeSum\" + EXCLUDED.\"minSplittingSetOrgsFilteredSizeSum\",\n" +
            "    \"crawlCount\" = EXCLUDED.\"crawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}