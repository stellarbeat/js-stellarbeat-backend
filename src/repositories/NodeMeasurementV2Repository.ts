import { EntityRepository, Repository } from 'typeorm';
import NodeMeasurementV2 from '../entities/NodeMeasurementV2';
import { injectable } from 'inversify';

export interface NodeMeasurementV2AverageRecord {
	nodeStoragePublicKeyId: number;
	activeAvg: string;
	validatingAvg: string;
	fullValidatorAvg: string;
	overLoadedAvg: string;
	indexAvg: string;
}

export class NodeMeasurementV2Average {
	nodeStoragePublicKeyId: number;
	activeAvg: number;
	validatingAvg: number;
	fullValidatorAvg: number;
	overLoadedAvg: number;
	indexAvg: number;

	constructor(
		nodeStoragePublicKeyId: number,
		activeAvg: number,
		validatingAvg: number,
		fullValidatorAvg: number,
		overLoadedAvg: number,
		indexAvg: number
	) {
		this.nodeStoragePublicKeyId = nodeStoragePublicKeyId;
		this.activeAvg = activeAvg;
		this.validatingAvg = validatingAvg;
		this.fullValidatorAvg = fullValidatorAvg;
		this.overLoadedAvg = overLoadedAvg;
		this.indexAvg = indexAvg;
	}

	static fromDatabaseRecord(record: NodeMeasurementV2AverageRecord) {
		return new this(
			record.nodeStoragePublicKeyId,
			Number(record.activeAvg),
			Number(record.validatingAvg),
			Number(record.fullValidatorAvg),
			Number(record.overLoadedAvg),
			Number(record.indexAvg)
		);
	}

	toString() {
		return `NodeMeasurementV2Average (nodeStoragePublicKeyId: ${this.nodeStoragePublicKeyId}, activeAvg: ${this.activeAvg}, validatingAvg: ${this.validatingAvg}, fullValidatorAvg: ${this.fullValidatorAvg}, overLoadedAvg: ${this.overLoadedAvg}, indexAvg: ${this.indexAvg})`;
	}
}

@injectable()
@EntityRepository(NodeMeasurementV2)
export class NodeMeasurementV2Repository extends Repository<NodeMeasurementV2> {
	async findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<NodeMeasurementV2Average[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.query(
			'WITH crawl_count AS (SELECT count(*) AS "nr_of_crawls"\n' +
				'                     FROM "crawl_v2" "CrawlV2"\n' +
				'                     WHERE "time" >= $1\n' +
				'                       and "time" <= $2\n' +
				'                       AND completed = true)\n' +
				'SELECT "nodePublicKeyStorageId"                      as "nodeStoragePublicKeyId",\n' +
				'       ROUND(100.0 * avg("isActive"::int), 2)        as "activeAvg",\n' +
				'       ROUND(100.0 * avg("isValidating"::int), 2)    as "validatingAvg",\n' +
				'       ROUND(100.0 * avg("isOverLoaded"::int), 2)    as "overLoadedAvg",\n' +
				'       ROUND(100.0 * avg("isFullValidator"::int), 2) as "fullValidatorAvg",\n' +
				'       ROUND(avg("index"::int), 2)                   as "indexAvg",\n' +
				'       count(*)                                      as "msCount"\n' +
				'FROM "node_measurement_v2" "NodeMeasurementV2"\n' +
				'WHERE "time" >= $1\n' +
				'  and "time" <= $2\n' +
				'GROUP BY "nodePublicKeyStorageId"\n' +
				'having count(*) >= (select nr_of_crawls from crawl_count)',
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

	async findXCrawlsInactiveOrNotValidatingSinceLatestCrawl(
		x: number
	): Promise<
		{ publicKey: string; notValidating: boolean; inactive: boolean }[]
	> {
		x++;

		return this.query(
			'select node_public_key."publicKey",\n       ' +
				'case when count(case when "isValidating" = true then 1 end) = 1 and max(case when "isValidating" = true then c.nr else 0 end) = $1 then true else false end "notValidating",\n' +
				'case when count(case when "isActive" = true then 1 end) = 1 and max(case when "isActive" = true then c.nr else 0 end) = $1 then true else false end "inactive"\n' +
				'from node_measurement_v2 nmv2\n' +
				'join lateral ( select row_number() over (order by time desc) as nr, time from crawl_v2\n' +
				'   where completed = true\n' +
				'   order by time desc\n' +
				'    limit $1\n' +
				'    ) c on c.time = nmv2.time\n' +
				'join node_public_key on nmv2."nodePublicKeyStorageId" = node_public_key.id\n' +
				'group by node_public_key."publicKey"\n' +
				'having (count(case when "isValidating" = true then 1 end) = 1 and max(case when "isValidating" = true then c.nr else 0 end) = $1)\n' +
				'    or (count(case when "isActive" = true then 1 end) = 1 and max(case when "isActive" = true then c.nr else 0 end) = $1)\n',
			[x]
		);
	}
}
