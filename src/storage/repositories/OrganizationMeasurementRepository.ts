import { EntityRepository, Repository } from 'typeorm';
import OrganizationMeasurement from '../entities/OrganizationMeasurement';
import { injectable } from 'inversify';

export interface OrganizationMeasurementEventResult {
	organizationId: string;
	subQuorumUnavailable: boolean;
}

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
export class OrganizationMeasurementRepository extends Repository<OrganizationMeasurement> {
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

	/**
	 * For example when x is 3 we look into a window of size 4. An event is returned if the fourth measurement is true, and the most recent three ar false.
	 * This indicates that is this the first time that there are three consecutive false records.
	 * first the network measurements sorted by time descending and adding a row number:
	 * 1 apr
	 * 2 mar
	 * 3 feb
	 * 4 jan
	 * Then we join with the measurements time column and count the number of true measurements and determine what the max row number where the measurement was active.
	 * When the count is 1 and the max is row 4, this means we have a window as described above
	 * @param x
	 */
	async findOrganizationMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<OrganizationMeasurementEventResult[]> {
		x++;

		return this.query(
			`select "oi"."organizationId",
                    (case
                         when count(case when "isSubQuorumAvailable" = true then 1 end) = 1
                             and max(case when "isSubQuorumAvailable" = true then c.nr else 0 end) = $1
                             then true
                         else false end) "subQuorumUnavailable"
             from organization_measurement om
                      join lateral ( select row_number() over (order by time desc) as nr, time
                                     from network_update
                                     where completed = true
                                     order by time desc
                                     limit $1
                 ) c
                           on c.time = om.time
                      join organization_id oi on om."organizationIdStorageId" = oi."id"
             group by oi."organizationId"
             having count(case when "isSubQuorumAvailable" = true then 1 end) = 1
                and max(case when "isSubQuorumAvailable" = true then c.nr else 0 end) = $1`,
			[x]
		);
	}
}
