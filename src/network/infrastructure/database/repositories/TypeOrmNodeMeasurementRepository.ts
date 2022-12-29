import { Between, EntityRepository, Repository } from 'typeorm';
import { injectable } from 'inversify';
import NodeMeasurement from '../../../domain/measurement/NodeMeasurement';
import { NodeMeasurementRepository } from '../../../domain/measurement/NodeMeasurementRepository';
import { NodeMeasurementAverage } from '../../../domain/measurement/NodeMeasurementAverage';
import { NodeMeasurementEvent } from '../../../domain/measurement/NodeMeasurementEvent';
import PublicKey from '../../../domain/PublicKey';

export interface NodeMeasurementAverageRecord {
	nodeId: number;
	activeAvg: string;
	validatingAvg: string;
	fullValidatorAvg: string;
	overLoadedAvg: string;
	indexAvg: string;
	historyArchiveErrorAvg: string;
}

export function nodeMeasurementAverageFromDatabaseRecord(
	record: NodeMeasurementAverageRecord
): NodeMeasurementAverage {
	return {
		nodeId: record.nodeId,
		activeAvg: Number(record.activeAvg),
		validatingAvg: Number(record.validatingAvg),
		fullValidatorAvg: Number(record.fullValidatorAvg),
		overLoadedAvg: Number(record.overLoadedAvg),
		indexAvg: Number(record.indexAvg),
		historyArchiveErrorAvg: Number(record.historyArchiveErrorAvg)
	};
}

@injectable()
@EntityRepository(NodeMeasurement)
export class TypeOrmNodeMeasurementRepository
	extends Repository<NodeMeasurement>
	implements NodeMeasurementRepository
{
	async findAllAt(at: Date): Promise<NodeMeasurement[]> {
		return await this.find({
			where: {
				time: at
			}
		});
	}

	findAt(id: string, at: Date): Promise<NodeMeasurement | undefined> {
		throw new Error('Method not implemented.');
	}

	/**
	 * Event detection queries explanation:
	 * For example when x is 3 we look into a window of size 4. An event is returned if the fourth measurement is true, and the most recent three ar false.
	 * This indicates that is this the first time that there are three consecutive false records.
	 * first the network measurements sorted by time descending and adding a row number:
	 * 1 apr
	 * 2 mar
	 * 3 feb
	 * 4 jan
	 * Then we join with the measurements time column and count the number of true measurements and determine what the max row number where the measurement was active.
	 * When the count is 1 and the max is row 4, this means we have a window as described above
	 */
	async findEventsForXNetworkUpdates(
		x: number,
		at: Date
	): Promise<NodeMeasurementEvent[]> {
		return await this.query(
			`select max(c."time") as   time,
					"node"."publicKeyValue" as "publicKey",
					case
						when count(case when "isValidating" = true then 1 end) = 1 and
							 max(case when "isValidating" = true then c.nr else 0 end) = $1 then true
						else false end "notValidating",
					case
						when count(case when "isActive" = true then 1 end) = 1 and
							 max(case when "isActive" = true then c.nr else 0 end) = $1 then true
						else false end "inactive",
					case
						when count(case when "isFullValidator" = true then 1 end) = 1 and
							 max(case when "isFullValidator" = true then c.nr else 0 end) = $1 then true
						else false end "historyOutOfDate"
			 from node_measurement_v2 nmv2
					  join lateral ( select row_number() over (order by time desc) as nr, time
									 from network_update
									 where completed = true and time <= $2::timestamptz
									 order by time desc
									 limit $1
				 ) c
						   on c.time = nmv2.time
					  join node on nmv2."nodeId" = node.id
			 group by node."publicKeyValue"
			 having (count(case when "isValidating" = true then 1 end) = 1
				 and max(case when "isValidating" = true then c.nr else 0 end) = $1)
				 or (count(case when "isActive" = true then 1 end) = 1
				 and max(case when "isActive" = true then c.nr else 0 end) = $1)
				 or (count(case when "isFullValidator" = true then 1 end) = 1
				 and max(case when "isFullValidator" = true then c.nr else 0 end) = $1)`,
			[x + 1, at]
		);
	}

	async findBetween(id: string, from: Date, to: Date) {
		const publicKeyOrError = PublicKey.create(id);
		if (publicKeyOrError.isErr()) return [];
		const publicKey = publicKeyOrError.value;
		return await this.createQueryBuilder('measurement')
			.innerJoinAndSelect(
				'measurement.node',
				'node',
				'node.publicKeyValue = :publicKey',
				{ publicKey: publicKey.value }
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
	): Promise<NodeMeasurementAverage[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.query(
			`WITH crawl_count AS (SELECT count(*) AS nr_of_updates
				                     FROM "network_update" "NetworkUpdate" 
				                     WHERE "time" >= $1 
				                       and "time" <= $2
				                       AND completed = true)
				SELECT "nodeId"                      as "nodeId",
				       ROUND(100.0 * avg("isActive"::int), 2)        as "activeAvg",
				       ROUND(100.0 * avg("isValidating"::int), 2)    as "validatingAvg",
				       ROUND(100.0 * avg("isOverLoaded"::int), 2)    as "overLoadedAvg",
				       ROUND(100.0 * avg("isFullValidator"::int), 2) as "fullValidatorAvg",
				       ROUND(avg("index"::int), 2)                   as "indexAvg",
					   ROUND(100.0 * avg("historyArchiveHasError"::int), 2) as "historyArchiveErrorAvg",
					   count(*)                                      as "msCount"
				FROM "node_measurement_v2" "NodeMeasurementV2"
				WHERE "time" >= $1
				  and "time" <= $2
				GROUP BY "nodeId"
				having count(*) >= (select nr_of_updates from crawl_count)`,
			[from, at]
		);

		return result.map((record: NodeMeasurementAverageRecord) =>
			nodeMeasurementAverageFromDatabaseRecord(record)
		);
	}

	async findInactiveAt(at: Date): Promise<{ nodeId: number }[]> {
		return this.createQueryBuilder('measurement')
			.distinct(true)
			.select('"nodeId"')
			.where('measurement.time = :at::timestamptz', { at: at })
			.andWhere('measurement.isActive = false')
			.getRawMany();
	}
}