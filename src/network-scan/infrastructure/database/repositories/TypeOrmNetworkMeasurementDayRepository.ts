import { Repository } from 'typeorm';
import NetworkMeasurementDay from '../../../domain/network/NetworkMeasurementDay';
import { injectable } from 'inversify';
import { NetworkMeasurementDayRepository } from '../../../domain/network/NetworkMeasurementDayRepository';
import { NetworkId } from '../../../domain/network/NetworkId';

@injectable()
export class TypeOrmNetworkMeasurementDayRepository
	implements NetworkMeasurementDayRepository
{
	constructor(private baseRepository: Repository<NetworkMeasurementDay>) {}

	async save(networkMeasurementDays: NetworkMeasurementDay[]) {
		return await this.baseRepository.save(networkMeasurementDays);
	}

	async findBetween(
		networkId: NetworkId,
		from: Date,
		to: Date
	): Promise<NetworkMeasurementDay[]> {
		const result = await this.baseRepository.query(
			`with measurements as (SELECT *
								   FROM "network_measurement_day" "NetworkMeasurementDay"
								   WHERE "time" >= date_trunc('day', $1::timestamptz)
									 and "time" <= date_trunc('day', $2::timestamptz))
			 select *
			 from (select generate_series(date_trunc('day', $1::TIMESTAMPTZ), date_trunc('day', $2::TIMESTAMPTZ),
										  interval '1 day')) d(day_series)
					  LEFT OUTER JOIN measurements on d.day_series = measurements.time`,
			[from, to]
		);

		return result.map((record: Record<string, string>) => {
			const measurement = new NetworkMeasurementDay();
			measurement.time = new Date(record.day_series);
			for (const [key, value] of Object.entries(record)) {
				if (key !== 'time' && key !== 'day_series') {
					// @ts-ignore
					measurement[key] = Number(value);
				}
			}
			return measurement;
		});
	}

	async rollup(fromNetworkScanId: number, toNetworkScanId: number) {
		await this.baseRepository.query(
			`INSERT INTO network_measurement_day ("time", "nrOfActiveWatchersSum", "nrOfActiveValidatorsSum",
												  "nrOfActiveFullValidatorsSum", "nrOfActiveOrganizationsSum",
												  "transitiveQuorumSetSizeSum", "hasQuorumIntersectionCount",
												  "hasSymmetricTopTierCount", "topTierMin", "topTierMax",
												  "topTierOrgsMin", "topTierOrgsMax", "minBlockingSetMin",
												  "minBlockingSetMax", "minBlockingSetOrgsMin", "minBlockingSetOrgsMax",
												  "minBlockingSetFilteredMin", "minBlockingSetFilteredMax",
												  "minBlockingSetOrgsFilteredMin", "minBlockingSetOrgsFilteredMax",
												  "minSplittingSetMin", "minSplittingSetMax", "minSplittingSetOrgsMin",
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
			 with updates as (select date_trunc('day', NetworkScan."time") "crawlDay",
									 count(distinct NetworkScan.id) "crawlCount"
							  from network_scan NetworkScan
							  WHERE NetworkScan.id BETWEEN $1 AND $2
								and NetworkScan.completed = true
							  group by "crawlDay")
			 select date_trunc('day', NetworkScan."time")     "day",
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
					updates."crawlCount" as                       "crawlCount",
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
					  JOIN updates on updates."crawlDay" = date_trunc('day', NetworkScan."time")
					  JOIN network_measurement on network_measurement."time" = NetworkScan."time"
			 WHERE NetworkScan.id BETWEEN $1 AND $2
			   AND NetworkScan.completed = true
			 group by day, "crawlCount"
			 ON CONFLICT (time) DO UPDATE
				 SET "nrOfActiveWatchersSum"            = network_measurement_day."nrOfActiveWatchersSum" +
														  EXCLUDED."nrOfActiveWatchersSum",
					 "nrOfActiveValidatorsSum"          = network_measurement_day."nrOfActiveValidatorsSum" +
														  EXCLUDED."nrOfActiveValidatorsSum",
					 "nrOfActiveFullValidatorsSum"      = network_measurement_day."nrOfActiveFullValidatorsSum" +
														  EXCLUDED."nrOfActiveFullValidatorsSum",
					 "nrOfActiveOrganizationsSum"       = network_measurement_day."nrOfActiveOrganizationsSum" +
														  EXCLUDED."nrOfActiveOrganizationsSum",
					 "transitiveQuorumSetSizeSum"       = network_measurement_day."transitiveQuorumSetSizeSum" +
														  EXCLUDED."transitiveQuorumSetSizeSum",
					 "hasQuorumIntersectionCount"       = network_measurement_day."hasQuorumIntersectionCount" +
														  EXCLUDED."hasQuorumIntersectionCount",
					 "hasSymmetricTopTierCount"         = network_measurement_day."hasSymmetricTopTierCount" +
														  EXCLUDED."hasSymmetricTopTierCount",
					 "hasTransitiveQuorumSetCount"      = network_measurement_day."hasTransitiveQuorumSetCount" +
														  EXCLUDED."hasTransitiveQuorumSetCount",
					 "topTierMin"                       = LEAST(network_measurement_day."topTierMin", EXCLUDED."topTierMin"),
					 "topTierMax"                       = GREATEST(network_measurement_day."topTierMax",
																   EXCLUDED."topTierMax"),
					 "topTierOrgsMin"                   = LEAST(network_measurement_day."topTierOrgsMin",
																EXCLUDED."topTierOrgsMin"),
					 "topTierOrgsMax"                   = GREATEST(network_measurement_day."topTierOrgsMax",
																   EXCLUDED."topTierOrgsMax"),
					 "minBlockingSetMin"                = LEAST(network_measurement_day."minBlockingSetMin",
																EXCLUDED."minBlockingSetMin"),
					 "minBlockingSetMax"                = GREATEST(network_measurement_day."minBlockingSetMax",
																   EXCLUDED."minBlockingSetMax"),
					 "minBlockingSetFilteredMin"        = LEAST(network_measurement_day."minBlockingSetFilteredMin",
																EXCLUDED."minBlockingSetFilteredMin"),
					 "minBlockingSetFilteredMax"        = GREATEST(network_measurement_day."minBlockingSetFilteredMax",
																   EXCLUDED."minBlockingSetFilteredMax"),
					 "minBlockingSetOrgsMin"            = LEAST(network_measurement_day."minBlockingSetOrgsMin",
																EXCLUDED."minBlockingSetOrgsMin"),
					 "minBlockingSetOrgsMax"            = GREATEST(network_measurement_day."minBlockingSetOrgsMax",
																   EXCLUDED."minBlockingSetOrgsMax"),
					 "minBlockingSetOrgsFilteredMin"    = LEAST(network_measurement_day."minBlockingSetOrgsFilteredMin",
																EXCLUDED."minBlockingSetOrgsFilteredMin"),
					 "minBlockingSetOrgsFilteredMax"    = GREATEST(
						 network_measurement_day."minBlockingSetOrgsFilteredMax",
						 EXCLUDED."minBlockingSetOrgsFilteredMax"),
					 "minSplittingSetMin"               = LEAST(network_measurement_day."minSplittingSetMin",
																EXCLUDED."minSplittingSetMin"),
					 "minSplittingSetMax"               = GREATEST(network_measurement_day."minSplittingSetMax",
																   EXCLUDED."minSplittingSetMax"),
					 "minSplittingSetOrgsMin"           = LEAST(network_measurement_day."minSplittingSetOrgsMin",
																EXCLUDED."minSplittingSetOrgsMin"),
					 "minSplittingSetOrgsMax"           = GREATEST(network_measurement_day."minSplittingSetOrgsMax",
																   EXCLUDED."minSplittingSetOrgsMax"),
					 "topTierSum"                       = network_measurement_day."topTierSum" + EXCLUDED."topTierSum",
					 "topTierOrgsSum"                   = network_measurement_day."topTierOrgsSum" + EXCLUDED."topTierOrgsSum",
					 "minBlockingSetSum"                = network_measurement_day."minBlockingSetSum" +
														  EXCLUDED."minBlockingSetSum",
					 "minBlockingSetOrgsSum"            = network_measurement_day."minBlockingSetOrgsSum" +
														  EXCLUDED."minBlockingSetOrgsSum",
					 "minBlockingSetFilteredSum"        = network_measurement_day."minBlockingSetFilteredSum" +
														  EXCLUDED."minBlockingSetFilteredSum",
					 "minBlockingSetOrgsFilteredSum"    = network_measurement_day."minBlockingSetOrgsFilteredSum" +
														  EXCLUDED."minBlockingSetOrgsFilteredSum",
					 "minSplittingSetSum"               = network_measurement_day."minSplittingSetSum" +
														  EXCLUDED."minSplittingSetSum",
					 "minSplittingSetOrgsSum"           = network_measurement_day."minSplittingSetOrgsSum" +
														  EXCLUDED."minSplittingSetOrgsSum",
					 "minBlockingSetCountryMin"         = LEAST(network_measurement_day."minBlockingSetCountryMin",
																EXCLUDED."minBlockingSetCountryMin"),
					 "minBlockingSetCountryMax"         = GREATEST(network_measurement_day."minBlockingSetCountryMax",
																   EXCLUDED."minBlockingSetCountryMax"),
					 "minBlockingSetCountryFilteredMin" = LEAST(
						 network_measurement_day."minBlockingSetCountryFilteredMin",
						 EXCLUDED."minBlockingSetCountryFilteredMin"),
					 "minBlockingSetCountryFilteredMax" = GREATEST(
						 network_measurement_day."minBlockingSetCountryFilteredMax",
						 EXCLUDED."minBlockingSetCountryFilteredMax"),
					 "minBlockingSetCountrySum"         = network_measurement_day."minBlockingSetCountrySum" +
														  EXCLUDED."minBlockingSetCountrySum",
					 "minBlockingSetCountryFilteredSum" = network_measurement_day."minBlockingSetCountryFilteredSum" +
														  EXCLUDED."minBlockingSetCountryFilteredSum",
					 "minBlockingSetISPMin"             = LEAST(network_measurement_day."minBlockingSetISPMin",
																EXCLUDED."minBlockingSetISPMin"),
					 "minBlockingSetISPMax"             = GREATEST(network_measurement_day."minBlockingSetISPMax",
																   EXCLUDED."minBlockingSetISPMax"),
					 "minBlockingSetISPFilteredMin"     = LEAST(network_measurement_day."minBlockingSetISPFilteredMin",
																EXCLUDED."minBlockingSetISPFilteredMin"),
					 "minBlockingSetISPFilteredMax"     = GREATEST(
						 network_measurement_day."minBlockingSetISPFilteredMax",
						 EXCLUDED."minBlockingSetISPFilteredMax"),
					 "minBlockingSetISPSum"             = network_measurement_day."minBlockingSetISPSum" +
														  EXCLUDED."minBlockingSetISPSum",
					 "minBlockingSetISPFilteredSum"     = network_measurement_day."minBlockingSetISPFilteredSum" +
														  EXCLUDED."minBlockingSetISPFilteredSum",
					 "minSplittingSetCountryMin"        = LEAST(network_measurement_day."minSplittingSetCountryMin",
																EXCLUDED."minSplittingSetCountryMin"),
					 "minSplittingSetCountryMax"        = GREATEST(network_measurement_day."minSplittingSetCountryMax",
																   EXCLUDED."minSplittingSetCountryMax"),
					 "minSplittingSetCountrySum"        = network_measurement_day."minSplittingSetCountrySum" +
														  EXCLUDED."minSplittingSetCountrySum",
					 "minSplittingSetISPMin"            = LEAST(network_measurement_day."minSplittingSetISPMin",
																EXCLUDED."minSplittingSetISPMin"),
					 "minSplittingSetISPMax"            = GREATEST(network_measurement_day."minSplittingSetISPMax",
																   EXCLUDED."minSplittingSetISPMax"),
					 "minSplittingSetISPSum"            = network_measurement_day."minSplittingSetISPSum" +
														  EXCLUDED."minSplittingSetISPSum",
					 "crawlCount"                       = network_measurement_day."crawlCount" + EXCLUDED."crawlCount"`,
			[fromNetworkScanId, toNetworkScanId]
		);
	}
}
