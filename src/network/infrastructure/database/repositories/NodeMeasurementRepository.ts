import { Between, EntityRepository, Repository } from 'typeorm';
import { injectable } from 'inversify';
import { MeasurementRepository } from '../../../domain/measurement/MeasurementRepository';
import NodeMeasurement from '../../../domain/measurement/NodeMeasurement';

export interface NodeMeasurementV2AverageRecord {
	nodeStoragePublicKeyId: number;
	activeAvg: string;
	validatingAvg: string;
	fullValidatorAvg: string;
	overLoadedAvg: string;
	indexAvg: string;
	historyArchiveErrorAvg: string;
}

export class NodeMeasurementV2Average {
	constructor(
		public nodeStoragePublicKeyId: number,
		public activeAvg: number,
		public validatingAvg: number,
		public fullValidatorAvg: number,
		public overLoadedAvg: number,
		public indexAvg: number,
		public historyArchiveErrorAvg: number
	) {}

	static fromDatabaseRecord(record: NodeMeasurementV2AverageRecord) {
		return new this(
			record.nodeStoragePublicKeyId,
			Number(record.activeAvg),
			Number(record.validatingAvg),
			Number(record.fullValidatorAvg),
			Number(record.overLoadedAvg),
			Number(record.indexAvg),
			Number(record.historyArchiveErrorAvg)
		);
	}

	toString() {
		return `NodeMeasurementV2Average (nodeStoragePublicKeyId: ${this.nodeStoragePublicKeyId}, activeAvg: ${this.activeAvg}, validatingAvg: ${this.validatingAvg}, fullValidatorAvg: ${this.fullValidatorAvg}, overLoadedAvg: ${this.overLoadedAvg}, indexAvg: ${this.indexAvg})`;
	}
}

@injectable()
@EntityRepository(NodeMeasurement)
export class NodeMeasurementRepository
	extends Repository<NodeMeasurement>
	implements MeasurementRepository<NodeMeasurement>
{
	async findBetween(id: string, from: Date, to: Date) {
		return await this.createQueryBuilder('measurement')
			.innerJoinAndSelect(
				'measurement.nodePublicKeyStorage',
				'nodePublicKeyStorage',
				'nodePublicKeyStorage.publicKey = :id',
				{ id }
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
	): Promise<NodeMeasurementV2Average[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.query(
			`WITH crawl_count AS (SELECT count(*) AS nr_of_updates
				                     FROM "network_update" "NetworkUpdate" 
				                     WHERE "time" >= $1 
				                       and "time" <= $2
				                       AND completed = true)
				SELECT "nodePublicKeyStorageId"                      as "nodeStoragePublicKeyId",
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
				GROUP BY "nodePublicKeyStorageId"
				having count(*) >= (select nr_of_updates from crawl_count)`,
			[from, at]
		);

		return result.map((record: NodeMeasurementV2AverageRecord) =>
			NodeMeasurementV2Average.fromDatabaseRecord(record)
		);
	}

	async findInactiveAt(
		at: Date
	): Promise<{ nodePublicKeyStorageId: number }[]> {
		return this.createQueryBuilder('measurement')
			.distinct(true)
			.select('"nodePublicKeyStorageId"')
			.where('measurement.time = :at::timestamptz', { at: at })
			.andWhere('measurement.isActive = false')
			.getRawMany();
	}
}
