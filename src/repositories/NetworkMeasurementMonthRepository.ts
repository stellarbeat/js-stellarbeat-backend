import {EntityRepository, Repository} from "typeorm";
import {IMeasurementRollupRepository} from "./NodeMeasurementDayV2Repository";
import NetworkMeasurementMonth from "../entities/NetworkMeasurementMonth";
import {injectable} from "inversify";

@injectable()
@EntityRepository(NetworkMeasurementMonth)
export class NetworkMeasurementMonthRepository extends Repository<NetworkMeasurementMonth> implements IMeasurementRollupRepository{

    async findBetween(from: Date, to: Date):Promise<NetworkMeasurementMonth[]> {
        //TODO: check if empty dates get returned correctly
        let result = await this.query('with measurements as (\n' +
            '    SELECT *\n' +
            '    FROM "network_measurement_month" "NetworkMeasurementMonth"\n' +
            '    WHERE "time" >= date_trunc(\'month\', $1::timestamptz)\n' +
            '      and "time" <= date_trunc(\'month\', $2::timestamptz)\n' +
            ') select * ' +
            'from (select generate_series( date_trunc(\'month\', $1::TIMESTAMPTZ), date_trunc(\'month\', $2::TIMESTAMPTZ), interval \'1 month\')) d(month_series)\n' +
            '        LEFT OUTER JOIN measurements on d.month_series = date_trunc(\'month\',measurements.time)\n',
            [from, to]);

        return result.map((record:any) => {
            let measurement = new NetworkMeasurementMonth();
            measurement.time = new Date(record.month_series);
            for (const [key, value] of Object.entries(record)) {
                if(key !== 'time' && key!== 'month_series')
                    { // @ts-ignore
                        measurement[key] = Number(value);
                    }
            }
            return measurement;
        });
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO network_measurement_month (time, \"nrOfActiveWatchersSum\", \"nrOfActiveValidatorsSum\", \"nrOfActiveFullValidatorsSum\", \"nrOfActiveOrganizationsSum\", \"transitiveQuorumSetSizeSum\", \"hasQuorumIntersectionCount\", \"topTierMin\", \"topTierMax\",  \"topTierOrgsMin\", \"topTierOrgsMax\", \"minBlockingSetMin\", \"minBlockingSetMax\", \"minBlockingSetOrgsMin\", \"minBlockingSetOrgsMax\", \"minBlockingSetFilteredMin\", \"minBlockingSetFilteredMax\", \"minBlockingSetOrgsFilteredMin\", \"minBlockingSetOrgsFilteredMax\", \"minSplittingSetMin\", \"minSplittingSetMax\", \"minSplittingSetOrgsMin\", \"minSplittingSetOrgsMax\",  \"crawlCount\", \"topTierSum\", \"topTierOrgsSum\",  \"minBlockingSetSum\", \"minBlockingSetOrgsSum\", \"minBlockingSetFilteredSum\", \"minBlockingSetOrgsFilteredSum\", \"minSplittingSetSum\", \"minSplittingSetOrgsSum\", \"hasTransitiveQuorumSetCount\")\n" +
            "    with crawls as (\n" +
            "        select date_trunc('month', \"Crawl\".\"time\") \"crawlMonth\", count(distinct \"Crawl\".id) \"crawlCount\"\n" +
            "        from  crawl_v2 \"Crawl\"\n" +
            "        WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "        group by \"crawlMonth\"\n" +
            "    )\n" +
            "select date_trunc('month', \"CrawlV2\".\"time\") \"month\",\n" +
            "       sum(\"nrOfActiveWatchers\"::int) \"nrOfActiveWatchersSum\",\n" +
            "       sum(\"nrOfActiveValidators\"::int) \"nrOfActiveValidatorsSum\",\n" +
            "       sum(\"nrOfActiveFullValidators\"::int) \"nrOfActiveFullValidatorsSum\",\n" +
            "       sum(\"nrOfActiveOrganizations\"::int) \"nrOfActiveOrganizationsSum\",\n" +
            "       sum(\"transitiveQuorumSetSize\"::int) \"transitiveQuorumSetSizeSum\",\n" +
            "       sum(\"hasQuorumIntersection\"::int) \"hasQuorumIntersectionCount\",\n" +
            "       min(\"topTierSize\"::int) \"topTierMin\",\n" +
            "       max(\"topTierSize\"::int) \"topTierMax\",\n" +
            "       min(\"topTierOrgsSize\"::int) \"topTierOrgsMin\",\n" +
            "       max(\"topTierOrgsSize\"::int) \"topTierOrgsMax\",\n" +
            "       min(\"minBlockingSetSize\"::int) \"minBlockingSetMin\",\n" +
            "       max(\"minBlockingSetSize\"::int) \"minBlockingSetMax\",\n" +
            "       min(\"minBlockingSetOrgsSize\"::int) \"minBlockingSetOrgsMin\",\n" +
            "       max(\"minBlockingSetOrgsSize\"::int) \"minBlockingSetOrgsMax\",\n" +
            "       min(\"minBlockingSetFilteredSize\"::int) \"minBlockingSetFilteredMin\",\n" +
            "       max(\"minBlockingSetFilteredSize\"::int) \"minBlockingSetFilteredMax\",\n" +
            "       min(\"minBlockingSetOrgsFilteredSize\"::int) \"minBlockingSetOrgsFilteredMin\",\n" +
            "       max(\"minBlockingSetOrgsFilteredSize\"::int) \"minBlockingSetOrgsFilteredMax\",\n" +
            "       min(\"minSplittingSetSize\"::int) \"minSplittingSetMin\",\n" +
            "       max(\"minSplittingSetSize\"::int) \"minSplittingSetMax\",\n" +
            "       min(\"minSplittingSetOrgsSize\"::int) \"minSplittingSetOrgsMin\",\n" +
            "       max(\"minSplittingSetOrgsSize\"::int) \"minSplittingSetOrgsMax\",\n" +
            "       \"crawls\".\"crawlCount\" \"crawlCount\",\n" +
            "       sum(\"topTierSize\"::int) \"topTierSum\",\n" +
            "       sum(\"topTierOrgsSize\"::int) \"topTierOrgsSum\",\n" +
            "       sum(\"minBlockingSetSize\"::int) \"minBlockingSetSum\",\n" +
            "       sum(\"minBlockingSetOrgsSize\"::int) \"minBlockingSetOrgsSum\",\n" +
            "       sum(\"minBlockingSetFilteredSize\"::int) \"minBlockingSetFilteredSum\",\n" +
            "       sum(\"minBlockingSetOrgsFilteredSize\"::int) \"minBlockingSetOrgsFilteredSum\",\n" +
            "       sum(\"minSplittingSetSize\"::int) \"minSplittingSetSum\",\n" +
            "       sum(\"minSplittingSetOrgsSize\"::int) \"minSplittingSetOrgsSum\",\n" +
            "       sum(\"hasTransitiveQuorumSet\"::int) \"hasTransitiveQuorumSetCount\"\n" +
            '    FROM "crawl_v2" "CrawlV2"' +
            "    JOIN crawls on crawls.\"crawlMonth\" = date_trunc('month', \"CrawlV2\".\"time\")\n" +
            "    JOIN network_measurement on network_measurement.\"time\" = \"CrawlV2\".\"time\"\n" +
            "    WHERE \"CrawlV2\".id BETWEEN $1 AND $2 AND \"CrawlV2\".completed = true\n" +
            "group by month, \"crawlCount\"\n" +
            "ON CONFLICT (time) DO UPDATE\n" +
            "SET\n" +
            "    \"nrOfActiveWatchersSum\" = network_measurement_month.\"nrOfActiveWatchersSum\" + EXCLUDED.\"nrOfActiveWatchersSum\",\n" +
            "    \"nrOfActiveValidatorsSum\" = network_measurement_month.\"nrOfActiveValidatorsSum\" + EXCLUDED.\"nrOfActiveValidatorsSum\",\n" +
            "    \"nrOfActiveFullValidatorsSum\" = network_measurement_month.\"nrOfActiveFullValidatorsSum\" + EXCLUDED.\"nrOfActiveFullValidatorsSum\",\n" +
            "    \"nrOfActiveOrganizationsSum\" = network_measurement_month.\"nrOfActiveOrganizationsSum\" + EXCLUDED.\"nrOfActiveOrganizationsSum\",\n" +
            "    \"transitiveQuorumSetSizeSum\" = network_measurement_month.\"transitiveQuorumSetSizeSum\" + EXCLUDED.\"transitiveQuorumSetSizeSum\",\n" +
            "    \"hasQuorumIntersectionCount\" = network_measurement_month.\"hasQuorumIntersectionCount\" + EXCLUDED.\"hasQuorumIntersectionCount\",\n" +
            "    \"hasTransitiveQuorumSetCount\" = network_measurement_month.\"hasTransitiveQuorumSetCount\" + EXCLUDED.\"hasTransitiveQuorumSetCount\",\n" +
            "    \"topTierMin\" = LEAST(network_measurement_month.\"topTierMin\", EXCLUDED.\"topTierMin\") ,\n" +
            "    \"topTierMax\" = GREATEST(network_measurement_month.\"topTierMax\", EXCLUDED.\"topTierMax\") ,\n" +
            "    \"topTierOrgsMin\" = LEAST(network_measurement_month.\"topTierOrgsMin\", EXCLUDED.\"topTierOrgsMin\") ,\n" +
            "    \"topTierOrgsMax\" = GREATEST(network_measurement_month.\"topTierOrgsMax\", EXCLUDED.\"topTierOrgsMax\") ,\n" +
            "    \"minBlockingSetMin\" = LEAST(network_measurement_month.\"minBlockingSetMin\", EXCLUDED.\"minBlockingSetMin\") ,\n" +
            "    \"minBlockingSetMax\" = GREATEST(network_measurement_month.\"minBlockingSetMax\", EXCLUDED.\"minBlockingSetMax\") ,\n" +
            "    \"minBlockingSetFilteredMin\" = LEAST(network_measurement_month.\"minBlockingSetFilteredMin\", EXCLUDED.\"minBlockingSetFilteredMin\") ,\n" +
            "    \"minBlockingSetFilteredMax\" = GREATEST(network_measurement_month.\"minBlockingSetFilteredMax\", EXCLUDED.\"minBlockingSetFilteredMax\") ,\n" +
            "    \"minBlockingSetOrgsMin\" = LEAST(network_measurement_month.\"minBlockingSetOrgsMin\", EXCLUDED.\"minBlockingSetOrgsMin\") ,\n" +
            "    \"minBlockingSetOrgsMax\" = GREATEST(network_measurement_month.\"minBlockingSetOrgsMax\", EXCLUDED.\"minBlockingSetOrgsMax\") ,\n" +
            "    \"minBlockingSetOrgsFilteredMin\" = LEAST(network_measurement_month.\"minBlockingSetOrgsFilteredMin\", EXCLUDED.\"minBlockingSetOrgsFilteredMin\") ,\n" +
            "    \"minBlockingSetOrgsFilteredMax\" = GREATEST(network_measurement_month.\"minBlockingSetOrgsFilteredMax\", EXCLUDED.\"minBlockingSetOrgsFilteredMax\") ,\n" +
            "    \"minSplittingSetMin\" = LEAST(network_measurement_month.\"minSplittingSetMin\", EXCLUDED.\"minSplittingSetMin\") ,\n" +
            "    \"minSplittingSetMax\" = GREATEST(network_measurement_month.\"minSplittingSetMax\", EXCLUDED.\"minSplittingSetMax\") ,\n" +
            "    \"minSplittingSetOrgsMin\" = LEAST(network_measurement_month.\"minSplittingSetOrgsMin\", EXCLUDED.\"minSplittingSetOrgsMin\") ,\n" +
            "    \"minSplittingSetOrgsMax\" = GREATEST(network_measurement_month.\"minSplittingSetOrgsMax\", EXCLUDED.\"minSplittingSetOrgsMax\") ,\n" +
            "    \"topTierSum\" = network_measurement_month.\"topTierSum\" + EXCLUDED.\"topTierSum\",\n" +
            "    \"topTierOrgsSum\" = network_measurement_month.\"topTierOrgsSum\" + EXCLUDED.\"topTierOrgsSum\",\n" +
            "    \"minBlockingSetSum\" = network_measurement_month.\"minBlockingSetSum\" + EXCLUDED.\"minBlockingSetSum\",\n" +
            "    \"minBlockingSetOrgsSum\" = network_measurement_month.\"minBlockingSetOrgsSum\" + EXCLUDED.\"minBlockingSetOrgsSum\",\n" +
            "    \"minBlockingSetFilteredSum\" = network_measurement_month.\"minBlockingSetFilteredSum\" + EXCLUDED.\"minBlockingSetFilteredSum\",\n" +
            "    \"minBlockingSetOrgsFilteredSum\" = network_measurement_month.\"minBlockingSetOrgsFilteredSum\" + EXCLUDED.\"minBlockingSetOrgsFilteredSum\",\n" +
            "    \"minSplittingSetSum\" = network_measurement_month.\"minSplittingSetSum\" + EXCLUDED.\"minSplittingSetSum\",\n" +
            "    \"minSplittingSetOrgsSum\" = network_measurement_month.\"minSplittingSetOrgsSum\" + EXCLUDED.\"minSplittingSetOrgsSum\",\n" +
            "    \"crawlCount\" = network_measurement_month.\"crawlCount\" + EXCLUDED.\"crawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}