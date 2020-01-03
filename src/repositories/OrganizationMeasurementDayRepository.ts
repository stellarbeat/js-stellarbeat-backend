import {EntityRepository, Repository} from "typeorm";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";
import OrganizationMeasurementDay from "../entities/OrganizationMeasurementDay";
import {IMeasurementRollupRepository} from "./NodeMeasurementDayV2Repository";

@EntityRepository(OrganizationMeasurementDay)
export class OrganizationMeasurementDayRepository extends Repository<OrganizationMeasurementDay> implements IMeasurementRollupRepository{

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
        await this.query("INSERT INTO organization_measurement_day (day, \"organizationIdStorageId\", \"isSubQuorumAvailableCount\", \"indexSum\", \"crawlCount\")\n" +
            "    with crawls as (\n" +
            "        select date_trunc('day', \"Crawl\".\"validFrom\") \"crawlDay\", count(distinct \"Crawl2\".id) \"crawlCount\"\n" +
            "        from  crawl_v2 \"Crawl\"\n" +
            "        join crawl_v2 \"Crawl2\" on date_trunc('day', \"Crawl\".\"validFrom\") = date_trunc('day', \"Crawl2\".\"validFrom\") AND \"Crawl2\".completed = true\n" +
            "        WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "        group by \"crawlDay\"\n" +
            "    )\n" +
            "select date_trunc('day', \"validFrom\") \"day\",\n" +
            "       \"organizationIdStorageId\",\n" +
            "       sum(\"isSubQuorumAvailable\"::int) \"isSubQuorumAvailableCount\",\n" +
            "       sum(\"index\"::int) \"indexSum\",\n" +
            "       \"crawls\".\"crawlCount\" \"crawlCount\"\n" +
            '    FROM "crawl_v2" "CrawlV2"' +
            "             join crawls on crawls.\"crawlDay\" = date_trunc('day', \"CrawlV2\".\"validFrom\")\n" +
            "join organization_measurement on organization_measurement.\"crawlId\" = \"CrawlV2\".id\n" +
            "    WHERE \"CrawlV2\".id BETWEEN $1 AND $2 AND \"CrawlV2\".completed = true\n" +
            "group by day, \"organizationIdStorageId\", \"crawlCount\"\n" +
            "ON CONFLICT (day, \"organizationIdStorageId\") DO UPDATE\n" +
            "SET\n" +
            "    \"isSubQuorumAvailableCount\" = organization_measurement_day.\"isSubQuorumAvailableCount\" + EXCLUDED.\"isSubQuorumAvailableCount\",\n" +
            "    \"indexSum\" = organization_measurement_day.\"indexSum\" + EXCLUDED.\"indexSum\",\n" +
            "    \"crawlCount\" = EXCLUDED.\"crawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}