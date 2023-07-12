import { Between, Repository } from 'typeorm';
import OrganizationMeasurementDay from '../../../domain/organization/OrganizationMeasurementDay';
import { injectable } from 'inversify';
import { OrganizationMeasurementAverage } from '../../../domain/organization/OrganizationMeasurementAverage';
import {
	organizationMeasurementAverageFromDatabaseRecord,
	OrganizationMeasurementAverageRecord
} from './TypeOrmOrganizationMeasurementRepository';
import { OrganizationMeasurementDayRepository } from '../../../domain/organization/OrganizationMeasurementDayRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';

@injectable()
export class TypeOrmOrganizationMeasurementDayRepository
	implements OrganizationMeasurementDayRepository
{
	constructor(private baseRepository: Repository<OrganizationMeasurementDay>) {}

	async save(
		organizationMeasurementDays: OrganizationMeasurementDay[]
	): Promise<OrganizationMeasurementDay[]> {
		return await this.baseRepository.save(organizationMeasurementDays);
	}

	async findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.baseRepository.query(
			`select "organizationIdValue"                                              as "organizationId",
					ROUND(100.0 * (sum("isSubQuorumAvailableCount"::int::decimal) / sum("crawlCount")),
						  2)                                                      as "isSubQuorumAvailableAvg",
					ROUND((sum("indexSum"::int::decimal) / sum("crawlCount")), 2) as "indexAvg"
			 FROM "organization_measurement_day" "OrganizationMeasurementDay"
			 join "organization" "Organization" on "Organization"."id" = "OrganizationMeasurementDay"."organizationId"
			 WHERE time >= date_trunc('day', $1::TIMESTAMP)
			   and time <= date_trunc('day', $2::TIMESTAMP)
			 GROUP BY "organizationIdValue"
			 having count("organizationId") >= $3`, //needs at least a record every day in the range, or the average is NA
			[from, at, xDays]
		);

		return result.map((record: OrganizationMeasurementAverageRecord) =>
			organizationMeasurementAverageFromDatabaseRecord(record)
		);
	}

	async findBetween(organizationId: OrganizationId, from: Date, to: Date) {
		return await this.baseRepository
			.createQueryBuilder('ma')
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
		await this.baseRepository.query(
			`INSERT INTO organization_measurement_day (time, "organizationId", "isSubQuorumAvailableCount",
                                                       "indexSum", "crawlCount")
             with updates as (
                 select date_trunc('day', NetworkScan."time") "crawlDay",
                        count(distinct NetworkScan2.id)       "crawlCount"
                 from network_scan NetworkScan
                          join network_scan NetworkScan2
                               on date_trunc('day', NetworkScan."time") = date_trunc('day', NetworkScan2."time") AND
								  NetworkScan2.completed = true
                 WHERE NetworkScan.id BETWEEN $1 and $2
                   and NetworkScan.completed = true
                 group by "crawlDay"
             )
             select date_trunc('day', "NetworkScan"."time") "day",
                    "organizationId",
                    sum("isSubQuorumAvailable"::int)          "isSubQuorumAvailableCount",
                    sum("index"::int)                         "indexSum",
                    updates."crawlCount"                      as "crawlCount"
             FROM "network_scan" "NetworkScan"
                      join updates on updates."crawlDay" = date_trunc('day', "NetworkScan"."time")
                      join organization_measurement on organization_measurement."time" = "NetworkScan".time
             WHERE "NetworkScan".id BETWEEN $1 AND $2
               AND "NetworkScan".completed = true
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
