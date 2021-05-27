import {EntityRepository, Repository, MoreThanOrEqual} from "typeorm";
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

    async deleteFrom(from: Date){
        await this.delete({
            time: MoreThanOrEqual(from)
        })
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO network_measurement_day (\"time\", \"nrOfActiveWatchersSum\", \"nrOfActiveValidatorsSum\", \"nrOfActiveFullValidatorsSum\", \"nrOfActiveOrganizationsSum\", \"transitiveQuorumSetSizeSum\", \"hasQuorumIntersectionCount\", \"hasSymmetricTopTierCount\", \"topTierMin\", \"topTierMax\", \"topTierOrgsMin\", \"topTierOrgsMax\", \"minBlockingSetMin\", \"minBlockingSetMax\", \"minBlockingSetOrgsMin\", \"minBlockingSetOrgsMax\", \"minBlockingSetFilteredMin\", \"minBlockingSetFilteredMax\", \"minBlockingSetOrgsFilteredMin\", \"minBlockingSetOrgsFilteredMax\", \"minSplittingSetMin\", \"minSplittingSetMax\", \"minSplittingSetOrgsMin\", \"minSplittingSetOrgsMax\", \"crawlCount\", \"topTierSum\", \"topTierOrgsSum\", \"minBlockingSetSum\", \"minBlockingSetOrgsSum\", \"minBlockingSetFilteredSum\", \"minBlockingSetOrgsFilteredSum\", \"minSplittingSetSum\", \"minSplittingSetOrgsSum\", \"hasTransitiveQuorumSetCount\", \"minBlockingSetCountryMin\", \"minBlockingSetCountryMax\", \"minBlockingSetCountryFilteredMin\", \"minBlockingSetCountryFilteredMax\", \"minBlockingSetCountrySum\",\"minBlockingSetCountryFilteredSum\", \"minBlockingSetISPMin\", \"minBlockingSetISPMax\", \"minBlockingSetISPFilteredMin\", \"minBlockingSetISPFilteredMax\", \"minBlockingSetISPSum\",\"minBlockingSetISPFilteredSum\", \"minSplittingSetCountryMin\", \"minSplittingSetCountryMax\", \"minSplittingSetCountrySum\", \"minSplittingSetISPMin\", \"minSplittingSetISPMax\", \"minSplittingSetISPSum\")\n" +
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
            "       sum(\"hasSymmetricTopTier\"::int) \"hasSymmetricTopTierCount\",\n" +
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
            "       sum(\"hasTransitiveQuorumSet\"::int) \"hasTransitiveQuorumSetCount\",\n" +
            "       min(\"minBlockingSetCountrySize\"::int) \"minBlockingSetCountryMin\",\n" +
            "       max(\"minBlockingSetCountrySize\"::int) \"minBlockingSetCountryMax\",\n" +
            "       min(\"minBlockingSetCountryFilteredSize\"::int) \"minBlockingSetCountryFilteredMin\",\n" +
            "       max(\"minBlockingSetCountryFilteredSize\"::int) \"minBlockingSetCountryFilteredMax\",\n" +
            "       sum(\"minBlockingSetCountrySize\"::int) \"minBlockingSetCountrySum\",\n" +
            "       sum(\"minBlockingSetCountryFilteredSize\"::int) \"minBlockingSetCountryFilteredSum\",\n" +
            "       min(\"minBlockingSetISPSize\"::int) \"minBlockingSetISPMin\",\n" +
            "       max(\"minBlockingSetISPSize\"::int) \"minBlockingSetISPMax\",\n" +
            "       min(\"minBlockingSetISPFilteredSize\"::int) \"minBlockingSetISPFilteredMin\",\n" +
            "       max(\"minBlockingSetISPFilteredSize\"::int) \"minBlockingSetISPFilteredMax\",\n" +
            "       sum(\"minBlockingSetISPSize\"::int) \"minBlockingSetISPSum\",\n" +
            "       sum(\"minBlockingSetISPFilteredSize\"::int) \"minBlockingSetISPFilteredSum\",\n" +
            "       min(\"minSplittingSetCountrySize\"::int) \"minSplittingSetCountryMin\",\n" +
            "       max(\"minSplittingSetCountrySize\"::int) \"minSplittingSetCountryMax\",\n" +
            "       sum(\"minSplittingSetCountrySize\"::int) \"minSplittingSetCountrySum\",\n" +
            "       min(\"minSplittingSetISPSize\"::int) \"minSplittingSetISPMin\",\n" +
            "       max(\"minSplittingSetISPSize\"::int) \"minSplittingSetISPMax\",\n" +
            "       sum(\"minSplittingSetISPSize\"::int) \"minSplittingSetISPSum\"\n" +
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
            "    \"hasSymmetricTopTierCount\" = network_measurement_day.\"hasSymmetricTopTierCount\" + EXCLUDED.\"hasSymmetricTopTierCount\",\n" +
            "    \"hasTransitiveQuorumSetCount\" = network_measurement_day.\"hasTransitiveQuorumSetCount\" + EXCLUDED.\"hasTransitiveQuorumSetCount\",\n" +
            "    \"topTierMin\" = LEAST(network_measurement_day.\"topTierMin\", EXCLUDED.\"topTierMin\") ,\n" +
            "    \"topTierMax\" = GREATEST(network_measurement_day.\"topTierMax\", EXCLUDED.\"topTierMax\") ,\n" +
            "    \"topTierOrgsMin\" = LEAST(network_measurement_day.\"topTierOrgsMin\", EXCLUDED.\"topTierOrgsMin\") ,\n" +
            "    \"topTierOrgsMax\" = GREATEST(network_measurement_day.\"topTierOrgsMax\", EXCLUDED.\"topTierOrgsMax\") ,\n" +
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
            "    \"minSplittingSetOrgsMin\" = LEAST(network_measurement_day.\"minSplittingSetOrgsMin\", EXCLUDED.\"minSplittingSetOrgsMin\") ,\n" +
            "    \"minSplittingSetOrgsMax\" = GREATEST(network_measurement_day.\"minSplittingSetOrgsMax\", EXCLUDED.\"minSplittingSetOrgsMax\") ,\n" +
            "    \"topTierSum\" = network_measurement_day.\"topTierSum\" + EXCLUDED.\"topTierSum\",\n" +
            "    \"topTierOrgsSum\" = network_measurement_day.\"topTierOrgsSum\" + EXCLUDED.\"topTierOrgsSum\",\n" +
            "    \"minBlockingSetSum\" = network_measurement_day.\"minBlockingSetSum\" + EXCLUDED.\"minBlockingSetSum\",\n" +
            "    \"minBlockingSetOrgsSum\" = network_measurement_day.\"minBlockingSetOrgsSum\" + EXCLUDED.\"minBlockingSetOrgsSum\",\n" +
            "    \"minBlockingSetFilteredSum\" = network_measurement_day.\"minBlockingSetFilteredSum\" + EXCLUDED.\"minBlockingSetFilteredSum\",\n" +
            "    \"minBlockingSetOrgsFilteredSum\" = network_measurement_day.\"minBlockingSetOrgsFilteredSum\" + EXCLUDED.\"minBlockingSetOrgsFilteredSum\",\n" +
            "    \"minSplittingSetSum\" = network_measurement_day.\"minSplittingSetSum\" + EXCLUDED.\"minSplittingSetSum\",\n" +
            "    \"minSplittingSetOrgsSum\" = network_measurement_day.\"minSplittingSetOrgsSum\" + EXCLUDED.\"minSplittingSetOrgsSum\",\n" +
            "    \"minBlockingSetCountryMin\" = LEAST(network_measurement_day.\"minBlockingSetCountryMin\", EXCLUDED.\"minBlockingSetCountryMin\") ,\n" +
            "    \"minBlockingSetCountryMax\" = GREATEST(network_measurement_day.\"minBlockingSetCountryMax\", EXCLUDED.\"minBlockingSetCountryMax\") ,\n" +
            "    \"minBlockingSetCountryFilteredMin\" = LEAST(network_measurement_day.\"minBlockingSetCountryFilteredMin\", EXCLUDED.\"minBlockingSetCountryFilteredMin\") ,\n" +
            "    \"minBlockingSetCountryFilteredMax\" = GREATEST(network_measurement_day.\"minBlockingSetCountryFilteredMax\", EXCLUDED.\"minBlockingSetCountryFilteredMax\") ,\n" +
            "    \"minBlockingSetCountrySum\" = network_measurement_day.\"minBlockingSetCountrySum\" + EXCLUDED.\"minBlockingSetCountrySum\",\n" +
            "    \"minBlockingSetCountryFilteredSum\" = network_measurement_day.\"minBlockingSetCountryFilteredSum\" + EXCLUDED.\"minBlockingSetCountryFilteredSum\",\n" +
            "    \"minBlockingSetISPMin\" = LEAST(network_measurement_day.\"minBlockingSetISPMin\", EXCLUDED.\"minBlockingSetISPMin\") ,\n" +
            "    \"minBlockingSetISPMax\" = GREATEST(network_measurement_day.\"minBlockingSetISPMax\", EXCLUDED.\"minBlockingSetISPMax\") ,\n" +
            "    \"minBlockingSetISPFilteredMin\" = LEAST(network_measurement_day.\"minBlockingSetISPFilteredMin\", EXCLUDED.\"minBlockingSetISPFilteredMin\") ,\n" +
            "    \"minBlockingSetISPFilteredMax\" = GREATEST(network_measurement_day.\"minBlockingSetISPFilteredMax\", EXCLUDED.\"minBlockingSetISPFilteredMax\") ,\n" +
            "    \"minBlockingSetISPSum\" = network_measurement_day.\"minBlockingSetISPSum\" + EXCLUDED.\"minBlockingSetISPSum\",\n" +
            "    \"minBlockingSetISPFilteredSum\" = network_measurement_day.\"minBlockingSetISPFilteredSum\" + EXCLUDED.\"minBlockingSetISPFilteredSum\",\n" +
            "    \"minSplittingSetCountryMin\" = LEAST(network_measurement_day.\"minSplittingSetCountryMin\", EXCLUDED.\"minSplittingSetCountryMin\") ,\n" +
            "    \"minSplittingSetCountryMax\" = GREATEST(network_measurement_day.\"minSplittingSetCountryMax\", EXCLUDED.\"minSplittingSetCountryMax\") ,\n" +
            "    \"minSplittingSetCountrySum\" = network_measurement_day.\"minSplittingSetCountrySum\" + EXCLUDED.\"minSplittingSetCountrySum\",\n" +
            "    \"minSplittingSetISPMin\" = LEAST(network_measurement_day.\"minSplittingSetISPMin\", EXCLUDED.\"minSplittingSetISPMin\") ,\n" +
            "    \"minSplittingSetISPMax\" = GREATEST(network_measurement_day.\"minSplittingSetISPMax\", EXCLUDED.\"minSplittingSetISPMax\") ,\n" +
            "    \"minSplittingSetISPSum\" = network_measurement_day.\"minSplittingSetISPSum\" + EXCLUDED.\"minSplittingSetISPSum\",\n" +
            "    \"crawlCount\" = network_measurement_day.\"crawlCount\" + EXCLUDED.\"crawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}