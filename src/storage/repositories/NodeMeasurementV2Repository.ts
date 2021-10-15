import { EntityRepository, Repository } from 'typeorm';
import NodeMeasurementV2 from '../entities/NodeMeasurementV2';
import { injectable } from 'inversify';

export interface NodeMeasurementEventResult {
	publicKey: string;
	notValidating: boolean;
	inactive: boolean;
	historyOutOfDate: boolean;
}

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

	async findNodeMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<NodeMeasurementEventResult[]> {
		x++;

		return this.query(
			`select "node_public_key"."publicKey",
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
				 else false end "historyOutOfDate" from node_measurement_v2 nmv2
                      join lateral ( select row_number() over (order by time desc) as nr, time
                                     from network_update 
                                     where completed = true
                                     order by time desc
                                     limit $1
                 ) c
                           on c.time = nmv2.time
                      join node_public_key on nmv2."nodePublicKeyStorageId" = node_public_key.id
             group by node_public_key."publicKey"
             having (count(case when "isValidating" = true then 1 end) = 1
                 and max(case when "isValidating" = true then c.nr else 0 end) = $1)
                 or (count(case when "isActive" = true then 1 end) = 1
                 and max(case when "isActive" = true then c.nr else 0 end) = $1)
                 or (count(case when "isFullValidator" = true then 1 end) = 1
				 and max(case when "isFullValidator" = true then c.nr else 0 end) = $1)`,
			[x]
		);
	}
}
