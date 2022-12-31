import { Between, EntityRepository, Repository } from 'typeorm';
import OrganizationMeasurementDay from '../../../domain/measurement-aggregation/OrganizationMeasurementDay';
import { injectable } from 'inversify';
import { OrganizationMeasurementAverage } from '../../../domain/measurement-aggregation/OrganizationMeasurementAverage';
import {
	organizationMeasurementAverageFromDatabaseRecord,
	OrganizationMeasurementAverageRecord
} from './TypeOrmOrganizationMeasurementRepository';
import { OrganizationMeasurementDayRepository } from '../../../domain/measurement-aggregation/OrganizationMeasurementDayRepository';
import { OrganizationId } from '../../../domain/OrganizationId';

@injectable()
@EntityRepository(OrganizationMeasurementDay)
export class TypeOrmOrganizationMeasurementDayRepository
	extends Repository<OrganizationMeasurementDay>
	implements OrganizationMeasurementDayRepository
{
	async findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.query(
			`select "organizationId"                                              as "organizationId",
					ROUND(100.0 * (sum("isSubQuorumAvailableCount"::int::decimal) / sum("crawlCount")),
						  2)                                                      as "isSubQuorumAvailableAvg",
					ROUND((sum("indexSum"::int::decimal) / sum("crawlCount")), 2) as "indexAvg"
			 FROM "organization_measurement_day" "OrganizationMeasurementDay"
			 WHERE time >= date_trunc('day', $1::TIMESTAMP)
			   and time <= date_trunc('day', $2::TIMESTAMP)
			 GROUP BY "organizationId"
			 having count("organizationId") >= $3`, //needs at least a record every day in the range, or the average is NA
			[from, at, xDays]
		);

		return result.map((record: OrganizationMeasurementAverageRecord) =>
			organizationMeasurementAverageFromDatabaseRecord(record)
		);
	}

	async findBetween(organizationId: OrganizationId, from: Date, to: Date) {
		return await this.createQueryBuilder('ma')
			.innerJoinAndSelect(
				'ma.organization',
				'org',
				'org.organizationIdValue= :organizationIdValue',
				{ organizationIdValue: organizationId.value }
			)
			.where({
				_time: Between(from, to)
			})
			.orderBy({
				time: 'ASC'
			})
			.getMany();
	}

	async rollup(fromCrawlId: number, toCrawlId: number) {
		await this.query(
			`INSERT INTO organization_measurement_day (time, "organizationId", "isSubQuorumAvailableCount",
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
                    "organizationId",
                    sum("isSubQuorumAvailable"::int)          "isSubQuorumAvailableCount",
                    sum("index"::int)                         "indexSum",
                    updates."crawlCount"                      as "crawlCount"
             FROM "network_update" "NetworkUpdate"
                      join updates on updates."crawlDay" = date_trunc('day', "NetworkUpdate"."time")
                      join organization_measurement on organization_measurement."time" = "NetworkUpdate".time
             WHERE "NetworkUpdate".id BETWEEN $1 AND $2
               AND "NetworkUpdate".completed = true
             group by day, "organizationId", "crawlCount"
             ON CONFLICT (time, "organizationId") DO UPDATE
                 SET "isSubQuorumAvailableCount" = organization_measurement_day."isSubQuorumAvailableCount" +
                                                   EXCLUDED."isSubQuorumAvailableCount",
                     "indexSum"                  = organization_measurement_day."indexSum" + EXCLUDED."indexSum",
                     "crawlCount"                = EXCLUDED."crawlCount"`,
			[fromCrawlId, toCrawlId]
		);
	}
}
