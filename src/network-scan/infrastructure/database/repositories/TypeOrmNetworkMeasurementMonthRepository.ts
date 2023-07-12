import { Repository } from 'typeorm';
import NetworkMeasurementMonth from '../../../domain/network/NetworkMeasurementMonth';
import { injectable } from 'inversify';
import { NetworkMeasurementMonthRepository } from '../../../domain/network/NetworkMeasurementMonthRepository';
import { NetworkId } from '../../../domain/network/NetworkId';

@injectable()
export class TypeOrmNetworkMeasurementMonthRepository
	implements NetworkMeasurementMonthRepository
{
	constructor(private baseRepository: Repository<NetworkMeasurementMonth>) {}

	async save(
		networkMeasurementMonths: NetworkMeasurementMonth[]
	): Promise<NetworkMeasurementMonth[]> {
		return await this.baseRepository.save(networkMeasurementMonths);
	}

	async findBetween(
		networkId: NetworkId,
		from: Date,
		to: Date
	): Promise<NetworkMeasurementMonth[]> {
		const result = await this.baseRepository.query(
			`with measurements as (SELECT *
                                   FROM "network_measurement_month" "NetworkMeasurementMonth"
                                   WHERE "time" >= date_trunc('month', $1::timestamptz)
                                     and "time" <= date_trunc('month', $2::timestamptz))
             select *
             from (select generate_series(date_trunc('month', $1::TIMESTAMPTZ), date_trunc('month', $2::TIMESTAMPTZ),
                                          interval '1 month')) d(month_series)
                      LEFT OUTER JOIN measurements on d.month_series = date_trunc('month', measurements.time)`,
			[from, to]
		);

		return result.map((record: Record<string, string>) => {
			const measurement = new NetworkMeasurementMonth();
			measurement.time = new Date(record.month_series);
			for (const [key, value] of Object.entries(record)) {
				if (key !== 'time' && key !== 'month_series') {
					// @ts-ignore
					measurement[key] = Number(value);
				}
			}
			return measurement;
		});
	}

	async rollup(fromCrawlId: number, toCrawlId: number) {
		await this.baseRepository.query(
			`INSERT INTO network_measurement_month ("time", "nrOfActiveWatchersSum", "nrOfActiveValidatorsSum",
                                                    "nrOfActiveFullValidatorsSum", "nrOfActiveOrganizationsSum",
                                                    "transitiveQuorumSetSizeSum", "hasQuorumIntersectionCount",
                                                    "hasSymmetricTopTierCount", "topTierMin", "topTierMax",
                                                    "topTierOrgsMin", "topTierOrgsMax", "minBlockingSetMin",
                                                    "minBlockingSetMax", "minBlockingSetOrgsMin",
                                                    "minBlockingSetOrgsMax", "minBlockingSetFilteredMin",
                                                    "minBlockingSetFilteredMax", "minBlockingSetOrgsFilteredMin",
                                                    "minBlockingSetOrgsFilteredMax", "minSplittingSetMin",
                                                    "minSplittingSetMax", "minSplittingSetOrgsMin",
                                                    "minSplittingSetOrgsMax", "crawlCount", "topTierSum",
                                                    "topTierOrgsSum", "minBlockingSetSum", "minBlockingSetOrgsSum",
                                                    "minBlockingSetFilteredSum", "minBlockingSetOrgsFilteredSum",
                                                    "minSplittingSetSum", "minSplittingSetOrgsSum",
                                                    "hasTransitiveQuorumSetCount", "minBlockingSetCountryMin",
                                                    "minBlockingSetCountryMax", "minBlockingSetCountryFilteredMin",
                                                    "minBlockingSetCountryFilteredMax", "minBlockingSetCountrySum",
                                                    "minBlockingSetCountryFilteredSum", "minBlockingSetISPMin",
                                                    "minBlockingSetISPMax", "minBlockingSetISPFilteredMin",
                                                    "minBlockingSetISPFilteredMax", "minBlockingSetISPSum",
                                                    "minBlockingSetISPFilteredSum", "minSplittingSetCountryMin",
                                                    "minSplittingSetCountryMax", "minSplittingSetCountrySum",
                                                    "minSplittingSetISPMin", "minSplittingSetISPMax",
                                                    "minSplittingSetISPSum")
             with scans as (select date_trunc('month', NetworkScan."time") "crawlMonth",
                                     count(distinct NetworkScan.id) "crawlCount"
                              from network_scan NetworkScan
                              WHERE NetworkScan.id BETWEEN $1 AND $2
                                and NetworkScan.completed = true
                              group by "crawlMonth")
             select date_trunc('month', NetworkScan."time")   "month",
                    sum("nrOfActiveWatchers"::int)                "nrOfActiveWatchersSum",
                    sum("nrOfActiveValidators"::int)              "nrOfActiveValidatorsSum",
                    sum("nrOfActiveFullValidators"::int)          "nrOfActiveFullValidatorsSum",
                    sum("nrOfActiveOrganizations"::int)           "nrOfActiveOrganizationsSum",
                    sum("transitiveQuorumSetSize"::int)           "transitiveQuorumSetSizeSum",
                    sum("hasQuorumIntersection"::int)             "hasQuorumIntersectionCount",
                    sum("hasSymmetricTopTier"::int)               "hasSymmetricTopTierCount",
                    min("topTierSize"::int)                       "topTierMin",
                    max("topTierSize"::int)                       "topTierMax",
                    min("topTierOrgsSize"::int)                   "topTierOrgsMin",
                    max("topTierOrgsSize"::int)                   "topTierOrgsMax",
                    min("minBlockingSetSize"::int)                "minBlockingSetMin",
                    max("minBlockingSetSize"::int)                "minBlockingSetMax",
                    min("minBlockingSetOrgsSize"::int)            "minBlockingSetOrgsMin",
                    max("minBlockingSetOrgsSize"::int)            "minBlockingSetOrgsMax",
                    min("minBlockingSetFilteredSize"::int)        "minBlockingSetFilteredMin",
                    max("minBlockingSetFilteredSize"::int)        "minBlockingSetFilteredMax",
                    min("minBlockingSetOrgsFilteredSize"::int)    "minBlockingSetOrgsFilteredMin",
                    max("minBlockingSetOrgsFilteredSize"::int)    "minBlockingSetOrgsFilteredMax",
                    min("minSplittingSetSize"::int)               "minSplittingSetMin",
                    max("minSplittingSetSize"::int)               "minSplittingSetMax",
                    min("minSplittingSetOrgsSize"::int)           "minSplittingSetOrgsMin",
                    max("minSplittingSetOrgsSize"::int)           "minSplittingSetOrgsMax",
                    scans."crawlCount" as                       "crawlCount",
                    sum("topTierSize"::int)                       "topTierSum",
                    sum("topTierOrgsSize"::int)                   "topTierOrgsSum",
                    sum("minBlockingSetSize"::int)                "minBlockingSetSum",
                    sum("minBlockingSetOrgsSize"::int)            "minBlockingSetOrgsSum",
                    sum("minBlockingSetFilteredSize"::int)        "minBlockingSetFilteredSum",
                    sum("minBlockingSetOrgsFilteredSize"::int)    "minBlockingSetOrgsFilteredSum",
                    sum("minSplittingSetSize"::int)               "minSplittingSetSum",
                    sum("minSplittingSetOrgsSize"::int)           "minSplittingSetOrgsSum",
                    sum("hasTransitiveQuorumSet"::int)            "hasTransitiveQuorumSetCount",
                    min("minBlockingSetCountrySize"::int)         "minBlockingSetCountryMin",
                    max("minBlockingSetCountrySize"::int)         "minBlockingSetCountryMax",
                    min("minBlockingSetCountryFilteredSize"::int) "minBlockingSetCountryFilteredMin",
                    max("minBlockingSetCountryFilteredSize"::int) "minBlockingSetCountryFilteredMax",
                    sum("minBlockingSetCountrySize"::int)         "minBlockingSetCountrySum",
                    sum("minBlockingSetCountryFilteredSize"::int) "minBlockingSetCountryFilteredSum",
                    min("minBlockingSetISPSize"::int)             "minBlockingSetISPMin",
                    max("minBlockingSetISPSize"::int)             "minBlockingSetISPMax",
                    min("minBlockingSetISPFilteredSize"::int)     "minBlockingSetISPFilteredMin",
                    max("minBlockingSetISPFilteredSize"::int)     "minBlockingSetISPFilteredMax",
                    sum("minBlockingSetISPSize"::int)             "minBlockingSetISPSum",
                    sum("minBlockingSetISPFilteredSize"::int)     "minBlockingSetISPFilteredSum",
                    min("minSplittingSetCountrySize"::int)        "minSplittingSetCountryMin",
                    max("minSplittingSetCountrySize"::int)        "minSplittingSetCountryMax",
                    sum("minSplittingSetCountrySize"::int)        "minSplittingSetCountrySum",
                    min("minSplittingSetISPSize"::int)            "minSplittingSetISPMin",
                    max("minSplittingSetISPSize"::int)            "minSplittingSetISPMax",
                    sum("minSplittingSetISPSize"::int)            "minSplittingSetISPSum"
             FROM "network_scan" NetworkScan
                      JOIN scans on scans."crawlMonth" = date_trunc('month', NetworkScan."time")
                      JOIN network_measurement on network_measurement."time" = NetworkScan."time"
             WHERE NetworkScan.id BETWEEN $1 AND $2
               AND NetworkScan.completed = true
             group by month, "crawlCount"
             ON CONFLICT (time) DO UPDATE
                 SET "nrOfActiveWatchersSum"            = network_measurement_month."nrOfActiveWatchersSum" +
                                                          EXCLUDED."nrOfActiveWatchersSum",
                     "nrOfActiveValidatorsSum"          = network_measurement_month."nrOfActiveValidatorsSum" +
                                                          EXCLUDED."nrOfActiveValidatorsSum",
                     "nrOfActiveFullValidatorsSum"      = network_measurement_month."nrOfActiveFullValidatorsSum" +
                                                          EXCLUDED."nrOfActiveFullValidatorsSum",
                     "nrOfActiveOrganizationsSum"       = network_measurement_month."nrOfActiveOrganizationsSum" +
                                                          EXCLUDED."nrOfActiveOrganizationsSum",
                     "transitiveQuorumSetSizeSum"       = network_measurement_month."transitiveQuorumSetSizeSum" +
                                                          EXCLUDED."transitiveQuorumSetSizeSum",
                     "hasQuorumIntersectionCount"       = network_measurement_month."hasQuorumIntersectionCount" +
                                                          EXCLUDED."hasQuorumIntersectionCount",
                     "hasSymmetricTopTierCount"         = network_measurement_month."hasSymmetricTopTierCount" +
                                                          EXCLUDED."hasSymmetricTopTierCount",
                     "hasTransitiveQuorumSetCount"      = network_measurement_month."hasTransitiveQuorumSetCount" +
                                                          EXCLUDED."hasTransitiveQuorumSetCount",
                     "topTierMin"                       = LEAST(network_measurement_month."topTierMin", EXCLUDED."topTierMin"),
                     "topTierMax"                       = GREATEST(network_measurement_month."topTierMax",
                                                                   EXCLUDED."topTierMax"),
                     "topTierOrgsMin"                   = LEAST(network_measurement_month."topTierOrgsMin",
                                                                EXCLUDED."topTierOrgsMin"),
                     "topTierOrgsMax"                   = GREATEST(network_measurement_month."topTierOrgsMax",
                                                                   EXCLUDED."topTierOrgsMax"),
                     "minBlockingSetMin"                = LEAST(network_measurement_month."minBlockingSetMin",
                                                                EXCLUDED."minBlockingSetMin"),
                     "minBlockingSetMax"                = GREATEST(network_measurement_month."minBlockingSetMax",
                                                                   EXCLUDED."minBlockingSetMax"),
                     "minBlockingSetFilteredMin"        = LEAST(network_measurement_month."minBlockingSetFilteredMin",
                                                                EXCLUDED."minBlockingSetFilteredMin"),
                     "minBlockingSetFilteredMax"        = GREATEST(
                             network_measurement_month."minBlockingSetFilteredMax",
                             EXCLUDED."minBlockingSetFilteredMax"),
                     "minBlockingSetOrgsMin"            = LEAST(network_measurement_month."minBlockingSetOrgsMin",
                                                                EXCLUDED."minBlockingSetOrgsMin"),
                     "minBlockingSetOrgsMax"            = GREATEST(network_measurement_month."minBlockingSetOrgsMax",
                                                                   EXCLUDED."minBlockingSetOrgsMax"),
                     "minBlockingSetOrgsFilteredMin"    = LEAST(
                             network_measurement_month."minBlockingSetOrgsFilteredMin",
                             EXCLUDED."minBlockingSetOrgsFilteredMin"),
                     "minBlockingSetOrgsFilteredMax"    = GREATEST(
                             network_measurement_month."minBlockingSetOrgsFilteredMax",
                             EXCLUDED."minBlockingSetOrgsFilteredMax"),
                     "minSplittingSetMin"               = LEAST(network_measurement_month."minSplittingSetMin",
                                                                EXCLUDED."minSplittingSetMin"),
                     "minSplittingSetMax"               = GREATEST(network_measurement_month."minSplittingSetMax",
                                                                   EXCLUDED."minSplittingSetMax"),
                     "minSplittingSetOrgsMin"           = LEAST(network_measurement_month."minSplittingSetOrgsMin",
                                                                EXCLUDED."minSplittingSetOrgsMin"),
                     "minSplittingSetOrgsMax"           = GREATEST(network_measurement_month."minSplittingSetOrgsMax",
                                                                   EXCLUDED."minSplittingSetOrgsMax"),
                     "topTierSum"                       = network_measurement_month."topTierSum" + EXCLUDED."topTierSum",
                     "topTierOrgsSum"                   = network_measurement_month."topTierOrgsSum" + EXCLUDED."topTierOrgsSum",
                     "minBlockingSetSum"                = network_measurement_month."minBlockingSetSum" +
                                                          EXCLUDED."minBlockingSetSum",
                     "minBlockingSetOrgsSum"            = network_measurement_month."minBlockingSetOrgsSum" +
                                                          EXCLUDED."minBlockingSetOrgsSum",
                     "minBlockingSetFilteredSum"        = network_measurement_month."minBlockingSetFilteredSum" +
                                                          EXCLUDED."minBlockingSetFilteredSum",
                     "minBlockingSetOrgsFilteredSum"    = network_measurement_month."minBlockingSetOrgsFilteredSum" +
                                                          EXCLUDED."minBlockingSetOrgsFilteredSum",
                     "minSplittingSetSum"               = network_measurement_month."minSplittingSetSum" +
                                                          EXCLUDED."minSplittingSetSum",
                     "minSplittingSetOrgsSum"           = network_measurement_month."minSplittingSetOrgsSum" +
                                                          EXCLUDED."minSplittingSetOrgsSum",
                     "minBlockingSetCountryMin"         = LEAST(network_measurement_month."minBlockingSetCountryMin",
                                                                EXCLUDED."minBlockingSetCountryMin"),
                     "minBlockingSetCountryMax"         = GREATEST(network_measurement_month."minBlockingSetCountryMax",
                                                                   EXCLUDED."minBlockingSetCountryMax"),
                     "minBlockingSetCountryFilteredMin" = LEAST(
                             network_measurement_month."minBlockingSetCountryFilteredMin",
                             EXCLUDED."minBlockingSetCountryFilteredMin"),
                     "minBlockingSetCountryFilteredMax" = GREATEST(
                             network_measurement_month."minBlockingSetCountryFilteredMax",
                             EXCLUDED."minBlockingSetCountryFilteredMax"),
                     "minBlockingSetCountrySum"         = network_measurement_month."minBlockingSetCountrySum" +
                                                          EXCLUDED."minBlockingSetCountrySum",
                     "minBlockingSetCountryFilteredSum" = network_measurement_month."minBlockingSetCountryFilteredSum" +
                                                          EXCLUDED."minBlockingSetCountryFilteredSum",
                     "minBlockingSetISPMin"             = LEAST(network_measurement_month."minBlockingSetISPMin",
                                                                EXCLUDED."minBlockingSetISPMin"),
                     "minBlockingSetISPMax"             = GREATEST(network_measurement_month."minBlockingSetISPMax",
                                                                   EXCLUDED."minBlockingSetISPMax"),
                     "minBlockingSetISPFilteredMin"     = LEAST(
                             network_measurement_month."minBlockingSetISPFilteredMin",
                             EXCLUDED."minBlockingSetISPFilteredMin"),
                     "minBlockingSetISPFilteredMax"     = GREATEST(
                             network_measurement_month."minBlockingSetISPFilteredMax",
                             EXCLUDED."minBlockingSetISPFilteredMax"),
                     "minBlockingSetISPSum"             = network_measurement_month."minBlockingSetISPSum" +
                                                          EXCLUDED."minBlockingSetISPSum",
                     "minBlockingSetISPFilteredSum"     = network_measurement_month."minBlockingSetISPFilteredSum" +
                                                          EXCLUDED."minBlockingSetISPFilteredSum",
                     "minSplittingSetCountryMin"        = LEAST(network_measurement_month."minSplittingSetCountryMin",
                                                                EXCLUDED."minSplittingSetCountryMin"),
                     "minSplittingSetCountryMax"        = GREATEST(
                             network_measurement_month."minSplittingSetCountryMax",
                             EXCLUDED."minSplittingSetCountryMax"),
                     "minSplittingSetCountrySum"        = network_measurement_month."minSplittingSetCountrySum" +
                                                          EXCLUDED."minSplittingSetCountrySum",
                     "minSplittingSetISPMin"            = LEAST(network_measurement_month."minSplittingSetISPMin",
                                                                EXCLUDED."minSplittingSetISPMin"),
                     "minSplittingSetISPMax"            = GREATEST(network_measurement_month."minSplittingSetISPMax",
                                                                   EXCLUDED."minSplittingSetISPMax"),
                     "minSplittingSetISPSum"            = network_measurement_month."minSplittingSetISPSum" +
                                                          EXCLUDED."minSplittingSetISPSum",
                     "crawlCount"                       = network_measurement_month."crawlCount" + EXCLUDED."crawlCount"`,
			[fromCrawlId, toCrawlId]
		);
	}
}
