import {EntityRepository, Repository} from "typeorm";
import {IMeasurementRollupRepository} from "./NodeMeasurementDayV2Repository";
import NetworkMeasurementDay from "../entities/NetworkMeasurementDay";
import {injectable} from "inversify";

@injectable()
@EntityRepository(NetworkMeasurementDay)
export class NetworkMeasurementDayRepository extends Repository<NetworkMeasurementDay> implements IMeasurementRollupRepository{

    async findBetween(from: Date, to: Date):Promise<NetworkMeasurementDay[]> {
        let result = await this.query('with measurements as (\n' +
            '    SELECT *\n' +
            '    FROM "network_measurement_day" "NetworkMeasurementDay"\n' +
            '    WHERE "time" >= date_trunc(\'day\', $1::timestamptz)\n' +
            '      and "time" <= date_trunc(\'day\', $2::timestamptz)\n' +
            ') select * ' +
            'from (select generate_series( date_trunc(\'day\', $1::TIMESTAMPTZ), date_trunc(\'day\', $2::TIMESTAMPTZ), interval \'1 day\')) d(day_series)\n' +
            '        LEFT OUTER JOIN measurements on d.day_series = measurements.time\n',
            [from, to]);

        return result.map((record:any) => {
            let measurement = new NetworkMeasurementDay();
            measurement.time = new Date(record.day_series);
            for (const [key, value] of Object.entries(record)) {
                if(key !== 'time' && key!== 'day_series')
                    { // @ts-ignore
                        measurement[key] = Number(value);
                    }
            }
            return measurement;
        });
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO network_measurement_day (\"time\", \"nrOfActiveWatchersSum\", \"nrOfActiveValidatorsSum\", \"nrOfActiveFullValidatorsSum\", \"nrOfActiveOrganizationsSum\", \"transitiveQuorumSetSizeSum\", \"hasQuorumIntersectionCount\", \"hasQuorumIntersectionFilteredCount\", \"topTierMin\", \"topTierMax\", \"topTierFilteredMin\", \"topTierFilteredMax\", \"topTierOrgsMin\", \"topTierOrgsMax\", \"topTierOrgsFilteredMin\", \"topTierOrgsFilteredMax\",\"minBlockingSetMin\", \"minBlockingSetMax\", \"minBlockingSetOrgsMin\", \"minBlockingSetOrgsMax\", \"minBlockingSetFilteredMin\", \"minBlockingSetFilteredMax\", \"minBlockingSetOrgsFilteredMin\", \"minBlockingSetOrgsFilteredMax\", \"minSplittingSetMin\", \"minSplittingSetMax\", \"minSplittingSetOrgsMin\", \"minSplittingSetOrgsMax\", \"minSplittingSetFilteredMin\", \"minSplittingSetFilteredMax\", \"minSplittingSetOrgsFilteredMin\", \"minSplittingSetOrgsFilteredMax\", \"crawlCount\", \"topTierSum\", \"topTierFilteredSum\", \"topTierOrgsSum\", \"topTierOrgsFilteredSum\", \"minBlockingSetSum\", \"minBlockingSetOrgsSum\", \"minBlockingSetFilteredSum\", \"minBlockingSetOrgsFilteredSum\", \"minSplittingSetSum\", \"minSplittingSetOrgsSum\", \"minSplittingSetFilteredSum\", \"minSplittingSetOrgsFilteredSum\")\n" +
            "    with crawls as (\n" +
            "        select date_trunc('day', \"Crawl\".\"time\") \"crawlDay\", count(distinct \"Crawl\".id) \"crawlCount\"\n" +
            "        from  crawl_v2 \"Crawl\"\n" +
            "        WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "        group by \"crawlDay\"\n" +
            "    )\n" +
            "select date_trunc('day', \"CrawlV2\".\"time\") \"day\",\n" +
            "       sum(\"nrOfActiveWatchers\"::int) \"nrOfActiveWatchersSum\",\n" +
            "       sum(\"nrOfActiveValidators\"::int) \"nrOfActiveValidatorsSum\",\n" +
            "       sum(\"nrOfActiveFullValidators\"::int) \"nrOfActiveFullValidatorsSum\",\n" +
            "       sum(\"nrOfActiveOrganizations\"::int) \"nrOfActiveOrganizationsSum\",\n" +
            "       sum(\"transitiveQuorumSetSize\"::int) \"transitiveQuorumSetSizeSum\",\n" +
            "       sum(\"hasQuorumIntersection\"::int) \"hasQuorumIntersectionCount\",\n" +
            "       sum(\"hasQuorumIntersectionFiltered\"::int) \"hasQuorumIntersectionFilteredCount\",\n" +
            "       min(\"topTierSize\"::int) \"topTierMin\",\n" +
            "       max(\"topTierSize\"::int) \"topTierMax\",\n" +
            "       min(\"topTierFilteredSize\"::int) \"topTierFilteredMin\",\n" +
            "       max(\"topTierFilteredSize\"::int) \"topTierFilteredMax\",\n" +
            "       min(\"topTierOrgsSize\"::int) \"topTierOrgsMin\",\n" +
            "       max(\"topTierOrgsSize\"::int) \"topTierOrgsMax\",\n" +
            "       min(\"topTierOrgsFilteredSize\"::int) \"topTierOrgsFilteredMin\",\n" +
            "       max(\"topTierOrgsFilteredSize\"::int) \"topTierOrgsFilteredMax\",\n" +
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
            "       min(\"minSplittingSetFilteredSize\"::int) \"minSplittingSetFilteredMin\",\n" +
            "       max(\"minSplittingSetFilteredSize\"::int) \"minSplittingSetFilteredMax\",\n" +
            "       min(\"minSplittingSetOrgsFilteredSize\"::int) \"minSplittingSetOrgsFilteredMin\",\n" +
            "       max(\"minSplittingSetOrgsFilteredSize\"::int) \"minSplittingSetOrgsFilteredMax\",\n" +
            "       \"crawls\".\"crawlCount\" \"crawlCount\",\n" +
            "       sum(\"topTierSize\"::int) \"topTierSum\",\n" +
            "       sum(\"topTierFilteredSize\"::int) \"topTierFilteredSum\",\n" +
            "       sum(\"topTierOrgsSize\"::int) \"topTierOrgsSum\",\n" +
            "       sum(\"topTierOrgsFilteredSize\"::int) \"topTierOrgsFilteredSum\",\n" +
            "       sum(\"minBlockingSetSize\"::int) \"minBlockingSetSum\",\n" +
            "       sum(\"minBlockingSetOrgsSize\"::int) \"minBlockingSetOrgsSum\",\n" +
            "       sum(\"minBlockingSetFilteredSize\"::int) \"minBlockingSetFilteredSum\",\n" +
            "       sum(\"minBlockingSetOrgsFilteredSize\"::int) \"minBlockingSetOrgsFilteredSum\",\n" +
            "       sum(\"minSplittingSetSize\"::int) \"minSplittingSetSum\",\n" +
            "       sum(\"minSplittingSetOrgsSize\"::int) \"minSplittingSetOrgsSum\",\n" +
            "       sum(\"minSplittingSetFilteredSize\"::int) \"minSplittingSetFilteredSum\",\n" +
            "       sum(\"minSplittingSetOrgsFilteredSize\"::int) \"minSplittingSetOrgsFilteredSum\"\n" +
            '    FROM "crawl_v2" "CrawlV2"' +
            "    JOIN crawls on crawls.\"crawlDay\" = date_trunc('day', \"CrawlV2\".\"time\")\n" +
            "    JOIN network_measurement on network_measurement.\"time\" = \"CrawlV2\".\"time\"\n" +
            "    WHERE \"CrawlV2\".id BETWEEN $1 AND $2 AND \"CrawlV2\".completed = true\n" +
            "group by day, \"crawlCount\"\n" +
            "ON CONFLICT (time) DO UPDATE\n" +
            "SET\n" +
            "    \"nrOfActiveWatchersSum\" = network_measurement_day.\"nrOfActiveWatchersSum\" + EXCLUDED.\"nrOfActiveWatchersSum\",\n" +
            "    \"nrOfActiveValidatorsSum\" = network_measurement_day.\"nrOfActiveValidatorsSum\" + EXCLUDED.\"nrOfActiveValidatorsSum\",\n" +
            "    \"nrOfActiveFullValidatorsSum\" = network_measurement_day.\"nrOfActiveFullValidatorsSum\" + EXCLUDED.\"nrOfActiveFullValidatorsSum\",\n" +
            "    \"nrOfActiveOrganizationsSum\" = network_measurement_day.\"nrOfActiveOrganizationsSum\" + EXCLUDED.\"nrOfActiveOrganizationsSum\",\n" +
            "    \"transitiveQuorumSetSizeSum\" = network_measurement_day.\"transitiveQuorumSetSizeSum\" + EXCLUDED.\"transitiveQuorumSetSizeSum\",\n" +
            "    \"hasQuorumIntersectionCount\" = network_measurement_day.\"hasQuorumIntersectionCount\" + EXCLUDED.\"hasQuorumIntersectionCount\",\n" +
            "    \"hasQuorumIntersectionFilteredCount\" = network_measurement_day.\"hasQuorumIntersectionFilteredCount\" + EXCLUDED.\"hasQuorumIntersectionFilteredCount\",\n" +
            "    \"topTierMin\" = LEAST(network_measurement_day.\"topTierMin\", EXCLUDED.\"topTierMin\") ,\n" +
            "    \"topTierMax\" = GREATEST(network_measurement_day.\"topTierMax\", EXCLUDED.\"topTierMax\") ,\n" +
            "    \"topTierFilteredMin\" = LEAST(network_measurement_day.\"topTierFilteredMin\", EXCLUDED.\"topTierFilteredMin\") ,\n" +
            "    \"topTierFilteredMax\" = GREATEST(network_measurement_day.\"topTierFilteredMax\", EXCLUDED.\"topTierFilteredMax\") ,\n" +
            "    \"topTierOrgsMin\" = LEAST(network_measurement_day.\"topTierOrgsMin\", EXCLUDED.\"topTierOrgsMin\") ,\n" +
            "    \"topTierOrgsMax\" = GREATEST(network_measurement_day.\"topTierOrgsMax\", EXCLUDED.\"topTierOrgsMax\") ,\n" +
            "    \"topTierOrgsFilteredMin\" = LEAST(network_measurement_day.\"topTierOrgsFilteredMin\", EXCLUDED.\"topTierOrgsFilteredMin\") ,\n" +
            "    \"topTierOrgsFilteredMax\" = GREATEST(network_measurement_day.\"topTierOrgsFilteredMax\", EXCLUDED.\"topTierOrgsFilteredMax\") ,\n" +
            "    \"minBlockingSetMin\" = LEAST(network_measurement_day.\"minBlockingSetMin\", EXCLUDED.\"minBlockingSetMin\") ,\n" +
            "    \"minBlockingSetMax\" = GREATEST(network_measurement_day.\"minBlockingSetMax\", EXCLUDED.\"minBlockingSetMax\") ,\n" +
            "    \"minBlockingSetFilteredMin\" = LEAST(network_measurement_day.\"minBlockingSetFilteredMin\", EXCLUDED.\"minBlockingSetFilteredMin\") ,\n" +
            "    \"minBlockingSetFilteredMax\" = GREATEST(network_measurement_day.\"minBlockingSetFilteredMax\", EXCLUDED.\"minBlockingSetFilteredMax\") ,\n" +
            "    \"minBlockingSetOrgsMin\" = LEAST(network_measurement_day.\"minBlockingSetOrgsMin\", EXCLUDED.\"minBlockingSetOrgsMin\") ,\n" +
            "    \"minBlockingSetOrgsMax\" = GREATEST(network_measurement_day.\"minBlockingSetOrgsMax\", EXCLUDED.\"minBlockingSetOrgsMax\") ,\n" +
            "    \"minBlockingSetOrgsFilteredMin\" = LEAST(network_measurement_day.\"minBlockingSetOrgsFilteredMin\", EXCLUDED.\"minBlockingSetOrgsFilteredMin\") ,\n" +
            "    \"minBlockingSetOrgsFilteredMax\" = GREATEST(network_measurement_day.\"minBlockingSetOrgsFilteredMax\", EXCLUDED.\"minBlockingSetOrgsFilteredMax\") ,\n" +
            "    \"minSplittingSetMin\" = LEAST(network_measurement_day.\"minSplittingSetMin\", EXCLUDED.\"minSplittingSetMin\") ,\n" +
            "    \"minSplittingSetMax\" = GREATEST(network_measurement_day.\"minSplittingSetMax\", EXCLUDED.\"minSplittingSetMax\") ,\n" +
            "    \"minSplittingSetFilteredMin\" = LEAST(network_measurement_day.\"minSplittingSetFilteredMin\", EXCLUDED.\"minSplittingSetFilteredMin\") ,\n" +
            "    \"minSplittingSetFilteredMax\" = GREATEST(network_measurement_day.\"minSplittingSetFilteredMax\", EXCLUDED.\"minSplittingSetFilteredMax\") ,\n" +
            "    \"minSplittingSetOrgsMin\" = LEAST(network_measurement_day.\"minSplittingSetOrgsMin\", EXCLUDED.\"minSplittingSetOrgsMin\") ,\n" +
            "    \"minSplittingSetOrgsMax\" = GREATEST(network_measurement_day.\"minSplittingSetOrgsMax\", EXCLUDED.\"minSplittingSetOrgsMax\") ,\n" +
            "    \"minSplittingSetOrgsFilteredMin\" = LEAST(network_measurement_day.\"minSplittingSetOrgsFilteredMin\", EXCLUDED.\"minSplittingSetOrgsFilteredMin\") ,\n" +
            "    \"minSplittingSetOrgsFilteredMax\" = GREATEST(network_measurement_day.\"minSplittingSetOrgsFilteredMax\", EXCLUDED.\"minSplittingSetOrgsFilteredMax\") ,\n" +
            "    \"topTierSum\" = network_measurement_day.\"topTierSum\" + EXCLUDED.\"topTierSum\",\n" +
            "    \"topTierFilteredSum\" = network_measurement_day.\"topTierFilteredSum\" + EXCLUDED.\"topTierFilteredSum\",\n" +
            "    \"topTierOrgsSum\" = network_measurement_day.\"topTierOrgsSum\" + EXCLUDED.\"topTierOrgsSum\",\n" +
            "    \"topTierOrgsFilteredSum\" = network_measurement_day.\"topTierOrgsFilteredSum\" + EXCLUDED.\"topTierOrgsFilteredSum\",\n" +
            "    \"minBlockingSetSum\" = network_measurement_day.\"minBlockingSetSum\" + EXCLUDED.\"minBlockingSetSum\",\n" +
            "    \"minBlockingSetOrgsSum\" = network_measurement_day.\"minBlockingSetOrgsSum\" + EXCLUDED.\"minBlockingSetOrgsSum\",\n" +
            "    \"minBlockingSetFilteredSum\" = network_measurement_day.\"minBlockingSetFilteredSum\" + EXCLUDED.\"minBlockingSetFilteredSum\",\n" +
            "    \"minBlockingSetOrgsFilteredSum\" = network_measurement_day.\"minBlockingSetOrgsFilteredSum\" + EXCLUDED.\"minBlockingSetOrgsFilteredSum\",\n" +
            "    \"minSplittingSetSum\" = network_measurement_day.\"minSplittingSetSum\" + EXCLUDED.\"minSplittingSetSum\",\n" +
            "    \"minSplittingSetOrgsSum\" = network_measurement_day.\"minSplittingSetOrgsSum\" + EXCLUDED.\"minSplittingSetOrgsSum\",\n" +
            "    \"minSplittingSetFilteredSum\" = network_measurement_day.\"minSplittingSetFilteredSum\" + EXCLUDED.\"minSplittingSetFilteredSum\",\n" +
            "    \"minSplittingSetOrgsFilteredSum\" = network_measurement_day.\"minSplittingSetOrgsFilteredSum\" + EXCLUDED.\"minSplittingSetOrgsFilteredSum\",\n" +
            "    \"crawlCount\" = network_measurement_day.\"crawlCount\" + EXCLUDED.\"crawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}