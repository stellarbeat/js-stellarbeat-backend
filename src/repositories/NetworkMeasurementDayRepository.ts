import {EntityRepository, Repository} from "typeorm";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import {IMeasurementRollupRepository} from "./NodeMeasurementDayV2Repository";
import NetworkMeasurementDay from "../entities/NetworkMeasurementDay";
import {injectable} from "inversify";

@injectable()
@EntityRepository(NetworkMeasurementDay)
export class NetworkMeasurementDayRepository extends Repository<NetworkMeasurementDay> implements IMeasurementRollupRepository{

    async findBetween(nodePublicKeyStorage: NodePublicKeyStorage, from: Date, to: Date) {
        return this.query('with measurements as (\n' +
            '    SELECT "NodeMeasurementDay"."day",\n' +
            '           "NodeMeasurementDay"."publicKey",\n' +
            '           "NodeMeasurementDay"."isValidatingCount",\n' +
            '           "NodeMeasurementDay"."crawlCount"\n' +
            '    FROM "crawl_v2" "CrawlV2"' +
            '    JOIN "node_measurement_day" "NodeMeasurementDay" ON "CrawlV2"."id" = "NodeMeasurementDay"."CrawlId"\n' +
            '    WHERE "nodePublicKeyStorageId" = $1\n' +
            '      AND "day" >= date_trunc(\'day\', $2::timestamp)\n' +
            '      and "day" <= date_trunc(\'day\', $3::timestamp)\n' +
            ') select d.day, $1 "publicKey", coalesce("isValidatingCount", 0) "isValidatingCount", coalesce("crawlCount",0) "crawlCount"\n' +
            'from (select generate_series( date_trunc(\'day\', $2::TIMESTAMP), date_trunc(\'day\', $3::TIMESTAMP), interval \'1 day\')) d(day)\n' +
            '        LEFT OUTER JOIN measurements on d.day = measurements.day\n',
            [nodePublicKeyStorage.id, from, to]);
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO network_measurement_day (day, \"nrOfActiveNodesSum\", \"nrOfValidatorsSum\", \"nrOfFullValidatorsSum\", \"nrOfOrganizationsSum\", \"transitiveQuorumSetSizeSum\", \"hasQuorumIntersectionCount\", \"crawlCount\")\n" +
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
            "       sum(\"hasQuorumIntersection\"::int) \"hasQuorumIntersectionCount\",\n" +
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
            "    \"crawlCount\" = EXCLUDED.\"crawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}