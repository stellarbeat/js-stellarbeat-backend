import {EntityRepository, Repository} from "typeorm";
import OrganizationMeasurementDay from "../entities/OrganizationMeasurementDay";
import {IMeasurementRollupRepository} from "./NodeMeasurementDayV2Repository";
import OrganizationIdStorage from "../entities/OrganizationIdStorage";
import {
    OrganizationMeasurementAverage,
    OrganizationMeasurementAverageRecord
} from "./OrganizationMeasurementRepository";
import {injectable} from "inversify";

@injectable()
@EntityRepository(OrganizationMeasurementDay)
export class OrganizationMeasurementDayRepository extends Repository<OrganizationMeasurementDay> implements IMeasurementRollupRepository{

    async findXDaysAverageAt(at: Date, xDays: number):Promise<OrganizationMeasurementAverage[]> {
        let from = new Date(at.getTime());
        from.setDate(at.getDate() - xDays);

        let result = await this.query(
            'select "organizationIdStorageId" as "organizationIdStorageId",\n' +
            '       ROUND(100.0 * (sum("isSubQuorumAvailableCount"::int::decimal) / sum("crawlCount")), 2)        as "isSubQuorumAvailableAvg",\n' +
            '       ROUND((sum("indexSum"::int::decimal ) / sum("crawlCount")),2)             as "indexAvg"' +
            'FROM "organization_measurement_day" "OrganizationMeasurementDay"\n' +
            'WHERE day >= date_trunc(\'day\', $1::TIMESTAMP)\n' + //todo: date trunc to nodejs side?
            '  and day <= date_trunc(\'day\', $2::TIMESTAMP)\n' +
            'GROUP BY "organizationIdStorageId"\n' +
            'having count("organizationIdStorageId") >= $3', //needs at least a record every day in the range, or the average is NA
            [from, at, xDays]
        );

        return result.map((record:OrganizationMeasurementAverageRecord) => OrganizationMeasurementAverage.fromDatabaseRecord(record));
    }

    async findBetween(organizationIdStorage: OrganizationIdStorage, from: Date, to: Date) {
        return this.query('with measurements as (\n' +
            '    SELECT "OrganizationMeasurementDay"."day",\n' +
            '           "OrganizationMeasurementDay"."organizationIdStorageId",\n' +
            '           "OrganizationMeasurementDay"."isSubQuorumAvailableCount",\n' +
            '           "OrganizationMeasurementDay"."crawlCount"\n' +
            ' FROM "organization_measurement_day" "OrganizationMeasurementDay"' +
            '    WHERE "organizationIdStorageId" = $1\n' +
            '      AND "day" >= date_trunc(\'day\', $2::timestamp)\n' +
            '      and "day" <= date_trunc(\'day\', $3::timestamp)\n' +
            ') select d.day, $1 "organizationIdStorageId", coalesce("isSubQuorumAvailableCount", 0) "isSubQuorumAvailableCount", coalesce("crawlCount",0) "crawlCount"\n' +
            'from (select generate_series( date_trunc(\'day\', $2::TIMESTAMP), date_trunc(\'day\', $3::TIMESTAMP), interval \'1 day\')) d(day)\n' +
            '        LEFT OUTER JOIN measurements on d.day = measurements.day\n',
            [organizationIdStorage.id, from, to]);
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO organization_measurement_day (day, \"organizationIdStorageId\", \"isSubQuorumAvailableCount\", \"indexSum\", \"crawlCount\")\n" +
            "    with crawls as (\n" +
            "        select date_trunc('day', \"Crawl\".\"time\") \"crawlDay\", count(distinct \"Crawl2\".id) \"crawlCount\"\n" +
            "        from  crawl_v2 \"Crawl\"\n" +
            "        join crawl_v2 \"Crawl2\" on date_trunc('day', \"Crawl\".\"time\") = date_trunc('day', \"Crawl2\".\"time\") AND \"Crawl2\".completed = true\n" +
            "        WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "        group by \"crawlDay\"\n" +
            "    )\n" +
            "select date_trunc('day', \"CrawlV2\".\"time\") \"day\",\n" +
            "       \"organizationIdStorageId\",\n" +
            "       sum(\"isSubQuorumAvailable\"::int) \"isSubQuorumAvailableCount\",\n" +
            "       sum(\"index\"::int) \"indexSum\",\n" +
            "       \"crawls\".\"crawlCount\" \"crawlCount\"\n" +
            '    FROM "crawl_v2" "CrawlV2"' +
            "             join crawls on crawls.\"crawlDay\" = date_trunc('day', \"CrawlV2\".\"time\")\n" +
            "join organization_measurement on organization_measurement.\"time\" = \"CrawlV2\".time\n" +
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