import { Between, EntityRepository, Repository } from 'typeorm';
import OrganizationMeasurement from '../../../domain/measurement/OrganizationMeasurement';
import { injectable } from 'inversify';
import { OrganizationMeasurementRepository } from '../../../domain/measurement/OrganizationMeasurementRepository';
import { OrganizationMeasurementAverage } from '../../../domain/measurement/OrganizationMeasurementAverage';
import { OrganizationMeasurementEvent } from '../../../domain/measurement/OrganizationMeasurementEvent';

export interface OrganizationMeasurementAverageRecord {
	organizationIdStorageId: number;
	isSubQuorumAvailableAvg: string;
}
export function organizationMeasurementAverageFromDatabaseRecord(
	record: OrganizationMeasurementAverageRecord
): OrganizationMeasurementAverage {
	return {
		organizationIdStorageId: record.organizationIdStorageId,
		isSubQuorumAvailableAvg: Number(record.isSubQuorumAvailableAvg)
	};
}

@injectable()
@EntityRepository(OrganizationMeasurement)
export class TypeOrmOrganizationMeasurementRepository
	extends Repository<OrganizationMeasurement>
	implements OrganizationMeasurementRepository
{
	async findBetween(
		organizationId: string,
		from: Date,
		to: Date
	): Promise<OrganizationMeasurement[]> {
		return await this.createQueryBuilder('measurement')
			.innerJoinAndSelect(
				'measurement.organizationIdStorage',
				'organizationId',
				'organizationId.organizationId = :organizationId',
				{ organizationId }
			)
			.where([
				{
					time: Between(from, to)
				}
			])
			.orderBy({
				time: 'ASC'
			})
			.getMany();
	}

	async findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<OrganizationMeasurementAverage[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.query(
			`WITH update_count AS (SELECT count(*) AS nr_of_updates
                                   FROM "network_update" "NetworkUpdate"
                                   WHERE "time" >= $1
                                     and "time" <= $2
                                     AND completed = true)
             SELECT "organizationIdStorageId"                          as "organizationIdStorageId",
                    ROUND(100.0 * avg("isSubQuorumAvailable"::int), 2) as "isSubQuorumAvailableAvg",
                    ROUND(avg("index"::int), 2)                        as "indexAvg",
                    count(*)                                           as "msCount"
             FROM "organization_measurement" "OrganizationMeasurement"
             WHERE "time" >= $1
               and "time" <= $2
             GROUP BY "organizationIdStorageId"
             having count(*) >= (select nr_of_updates from update_count)`,
			[from, at]
		);

		return result.map((record: OrganizationMeasurementAverageRecord) =>
			organizationMeasurementAverageFromDatabaseRecord(record)
		);
	}

	async findEventsForXNetworkUpdates(
		x: number,
		at: Date
	): Promise<OrganizationMeasurementEvent[]> {
		return await this.query(
			`select max(c."time") as   time, "oi"."organizationId",
					(case
						 when count(case when "isSubQuorumAvailable" = true then 1 end) = 1
							 and max(case when "isSubQuorumAvailable" = true then c.nr else 0 end) = $1
							 then true
						 else false end) "subQuorumUnavailable"
			 from organization_measurement om
					  join lateral ( select row_number() over (order by time desc) as nr, time
									 from network_update
									 where completed = true and time <= $2::timestamptz
									 order by time desc
									 limit $1
				 ) c
						   on c.time = om.time
					  join organization_id oi on om."organizationIdStorageId" = oi."id"
			 group by oi."organizationId"
			 having count(case when "isSubQuorumAvailable" = true then 1 end) = 1
				and max(case when "isSubQuorumAvailable" = true then c.nr else 0 end) = $1`,
			[x + 1, at]
		);
	}

	async findAllAt(at: Date): Promise<OrganizationMeasurement[]> {
		return await this.find({
			where: {
				time: at
			}
		});
	}

	async findAt(
		id: string,
		at: Date
	): Promise<OrganizationMeasurement | undefined> {
		throw new Error('Method not implemented.');
	}
}
