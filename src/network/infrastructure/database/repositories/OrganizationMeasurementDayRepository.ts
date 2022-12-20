import { EntityRepository, Repository } from 'typeorm';
import OrganizationMeasurementDay from '../entities/OrganizationMeasurementDay';
import { IMeasurementRollupRepository } from './NodeMeasurementDayV2Repository';
import OrganizationId from '../../../domain/OrganizationId';
import { injectable } from 'inversify';
import { OrganizationMeasurementAverage } from '../../../domain/measurement/OrganizationMeasurementAverage';
import {
	organizationMeasurementAverageFromDatabaseRecord,
	OrganizationMeasurementAverageRecord
} from './TypeOrmOrganizationMeasurementRepository';

@injectable()
@EntityRepository(OrganizationMeasurementDay)
export class OrganizationMeasurementDayRepository
	extends Repository<OrganizationMeasurementDay>
	implements IMeasurementRollupRepository
{
	async findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.query(
			`select "organizationIdStorageId"                                     as "organizationIdStorageId",
                    ROUND(100.0 * (sum("isSubQuorumAvailableCount"::int::decimal) / sum("crawlCount")),
                          2)                                                      as "isSubQuorumAvailableAvg",
                    ROUND((sum("indexSum"::int::decimal) / sum("crawlCount")), 2) as "indexAvg"
             FROM "organization_measurement_day" "OrganizationMeasurementDay"
             WHERE time >= date_trunc('day', $1::TIMESTAMP)
               and time <= date_trunc('day', $2::TIMESTAMP)
             GROUP BY "organizationIdStorageId"
             having count("organizationIdStorageId") >= $3`, //needs at least a record every day in the range, or the average is NA
			[from, at, xDays]
		);

		return result.map((record: OrganizationMeasurementAverageRecord) =>
			organizationMeasurementAverageFromDatabaseRecord(record)
		);
	}

	async findBetween(
		organizationIdStorage: OrganizationId,
		from: Date,
		to: Date
	) {
		return this.query(
			`with measurements as (
                SELECT "OrganizationMeasurementDay"."time",
                       "OrganizationMeasurementDay"."organizationIdStorageId",
                       "OrganizationMeasurementDay"."isSubQuorumAvailableCount",
                       "OrganizationMeasurementDay"."crawlCount"
                FROM "organization_measurement_day" "OrganizationMeasurementDay"
                WHERE "organizationIdStorageId" = $1
                  AND "time" >= date_trunc('day', $2::timestamp)
                  and "time" <= date_trunc('day', $3::timestamp)
            )
             select d.time,
                    $1                                       "organizationIdStorageId",
                    coalesce("isSubQuorumAvailableCount", 0) "isSubQuorumAvailableCount",
                    coalesce("crawlCount", 0)                "crawlCount"
             from (select generate_series(date_trunc('day', $2::TIMESTAMP), date_trunc('day', $3::TIMESTAMP),
                                          interval '1 day')) d(time)
                      LEFT OUTER JOIN measurements on d.time = measurements.time`,
			[organizationIdStorage.id, from, to]
		);
	}

	async rollup(fromCrawlId: number, toCrawlId: number) {
		await this.query(
			`INSERT INTO organization_measurement_day (time, "organizationIdStorageId", "isSubQuorumAvailableCount",
                                                       "indexSum", "crawlCount")
             with updates as (
                 select date_trunc('day', NetworkUpdate."time") "crawlDay",
                        count(distinct NetworkUpdate2.id)       "crawlCount"
                 from network_update NetworkUpdate
                          join network_update NetworkUpdate2
                               on date_trunc('day', NetworkUpdate."time") = date_trunc('day', NetworkUpdate2."time") AND
                                  NetworkUpdate2.completed = true
                 WHERE NetworkUpdate.id BETWEEN $1 and $2
                   and NetworkUpdate.completed = true
                 group by "crawlDay"
             )
             select date_trunc('day', "NetworkUpdate"."time") "day",
                    "organizationIdStorageId",
                    sum("isSubQuorumAvailable"::int)          "isSubQuorumAvailableCount",
                    sum("index"::int)                         "indexSum",
                    updates."crawlCount"                      "crawlCount"
             FROM "network_update" "NetworkUpdate"
                      join updates on updates."crawlDay" = date_trunc('day', "NetworkUpdate"."time")
                      join organization_measurement on organization_measurement."time" = "NetworkUpdate".time
             WHERE "NetworkUpdate".id BETWEEN $1 AND $2
               AND "NetworkUpdate".completed = true
             group by day, "organizationIdStorageId", "crawlCount"
             ON CONFLICT (time, "organizationIdStorageId") DO UPDATE
                 SET "isSubQuorumAvailableCount" = organization_measurement_day."isSubQuorumAvailableCount" +
                                                   EXCLUDED."isSubQuorumAvailableCount",
                     "indexSum"                  = organization_measurement_day."indexSum" + EXCLUDED."indexSum",
                     "crawlCount"                = EXCLUDED."crawlCount"`,
			[fromCrawlId, toCrawlId]
		);
	}

	async findXDaysInactive(
		since: Date,
		numberOfDays: number
	): Promise<{ organizationIdStorageId: number }[]> {
		return this.createQueryBuilder()
			.distinct(true)
			.select('"organizationIdStorageId"')
			.where(
				"time >= :since::timestamptz - :numberOfDays * interval '1 days'",
				{ since: since, numberOfDays: numberOfDays }
			)
			.having('sum("isSubQuorumAvailableCount") = 0')
			.groupBy(
				'"organizationIdStorageId", time >= :since::timestamptz - :numberOfDays * interval \'1 days\''
			)
			.getRawMany();
	}
}
