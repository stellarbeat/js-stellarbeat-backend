import { Between, EntityRepository, Repository } from 'typeorm';
import OrganizationMeasurement from '../../../domain/measurement/OrganizationMeasurement';
import { injectable } from 'inversify';
import { MeasurementRepository } from '../../../domain/measurement/MeasurementRepository';

export interface OrganizationMeasurementAverageRecord {
	organizationIdStorageId: number;
	isSubQuorumAvailableAvg: string;
}

export class OrganizationMeasurementAverage {
	organizationIdStorageId: number;
	isSubQuorumAvailableAvg: number;

	constructor(
		organizationIdStorageId: number,
		isSubQuorumAvailableAvg: number
	) {
		this.organizationIdStorageId = organizationIdStorageId;
		this.isSubQuorumAvailableAvg = isSubQuorumAvailableAvg;
	}

	static fromDatabaseRecord(record: OrganizationMeasurementAverageRecord) {
		return new this(
			record.organizationIdStorageId,
			Number(record.isSubQuorumAvailableAvg)
		);
	}

	toString() {
		return `OrganizationMeasurementAverage (organizationIdStorageId: ${this.organizationIdStorageId}, isSubQuorumAvailableAvg: ${this.isSubQuorumAvailableAvg})`;
	}
}

@injectable()
@EntityRepository(OrganizationMeasurement)
export class OrganizationMeasurementRepository
	extends Repository<OrganizationMeasurement>
	implements MeasurementRepository<OrganizationMeasurement>
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
			OrganizationMeasurementAverage.fromDatabaseRecord(record)
		);
	}
}
