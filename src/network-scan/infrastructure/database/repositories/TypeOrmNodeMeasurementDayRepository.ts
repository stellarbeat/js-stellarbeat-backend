import { Between, EntityRepository, Repository } from 'typeorm';
import NodeMeasurementDay from '../../../domain/node/NodeMeasurementDay';
import { injectable } from 'inversify';
import {
	nodeMeasurementAverageFromDatabaseRecord,
	NodeMeasurementAverageRecord
} from './TypeOrmNodeMeasurementRepository';
import { NodeMeasurementAverage } from '../../../domain/node/NodeMeasurementAverage';
import { NodeMeasurementDayRepository } from '../../../domain/node/NodeMeasurementDayRepository';
import PublicKey from '../../../domain/node/PublicKey';

export interface NodeMeasurementV2StatisticsRecord {
	time: string;
	isActiveCount: string;
	isValidatingCount: string;
	isFullValidatorCount: string;
	isOverloadedCount: string;
	indexSum: string;
	crawlCount: string;
	historyArchiveErrorCount: string;
}

export class NodeMeasurementV2Statistics {
	time: Date;

	constructor(
		day: Date,
		public isActiveCount: number,
		public isValidatingCount: number,
		public isFullValidatorCount: number,
		public isOverloadedCount: number,
		public indexSum: number,
		public crawlCount: number,
		public historyArchiveErrorCount: number
	) {
		this.time = day;
	}

	static fromDatabaseRecord(record: NodeMeasurementV2StatisticsRecord) {
		return new this(
			new Date(record.time),
			Number(record.isActiveCount),
			Number(record.isValidatingCount),
			Number(record.isFullValidatorCount),
			Number(record.isOverloadedCount),
			Number(record.indexSum),
			Number(record.crawlCount),
			Number(record.historyArchiveErrorCount)
		);
	}

	toString() {
		return `NodeMeasurementV2Average (day: ${this.time}, activeCount: ${this.isActiveCount}, isValidatingCount: ${this.isValidatingCount}, isFullValidatorCount: ${this.isFullValidatorCount}, isOverLoadedCount: ${this.isOverloadedCount}, indexSum: ${this.indexSum}, crawlCount: ${this.crawlCount})`;
	}
}

@injectable()
export class TypeOrmNodeMeasurementDayRepository
	implements NodeMeasurementDayRepository
{
	constructor(private baseRepository: Repository<NodeMeasurementDay>) {}

	async save(nodeMeasurementDays: NodeMeasurementDay[]): Promise<void> {
		await this.baseRepository.save(nodeMeasurementDays);
	}

	async findXDaysAverageAt(
		at: Date,
		xDays: number
	): Promise<NodeMeasurementAverage[]> {
		const from = new Date(at.getTime());
		from.setDate(at.getDate() - xDays);

		const result = await this.baseRepository.query(
			`select "publicKeyValue"                                                                  as "publicKey",
					ROUND(100.0 * (sum("isActiveCount"::decimal) / sum("crawlCount")), 2)     as "activeAvg",
					ROUND(100.0 * (sum("isValidatingCount"::decimal) / sum("crawlCount")), 2) as "validatingAvg",
					ROUND(100.0 * (sum("isFullValidatorCount"::decimal) / sum("crawlCount")),
						  2)                                                                  as "fullValidatorAvg",
					ROUND(100.0 * (sum("isOverloadedCount"::decimal) / sum("crawlCount")), 2) as "overLoadedAvg",
					ROUND(100.0 * (sum("historyArchiveErrorCount"::decimal) / sum("crawlCount")),
						  2)                                                                  as "historyArchiveErrorAvg",
					ROUND((sum("indexSum"::decimal) / sum("crawlCount")), 2)                  as "indexAvg"
			 FROM "node_measurement_day_v2" "NodeMeasurementDay"
			 JOIN node n on "NodeMeasurementDay"."nodeId" = n.id
			 WHERE time >= date_trunc('day', $1::TIMESTAMP)
			   and time <= date_trunc('day', $2::TIMESTAMP)
			 GROUP BY "publicKeyValue"
			 having count("nodeId") >= $3`, //needs at least a record every day in the range, or the average is NA
			[from, at, xDays]
		);

		return result.map((record: NodeMeasurementAverageRecord) =>
			nodeMeasurementAverageFromDatabaseRecord(record)
		);
	}

	async findBetween(
		publicKey: PublicKey,
		from: Date,
		to: Date
	): Promise<NodeMeasurementDay[]> {
		return await this.baseRepository
			.createQueryBuilder('ma')
			.innerJoinAndSelect(
				'ma.node',
				'node',
				'node.publicKeyValue = :publicKey',
				{ publicKey: publicKey.value }
			)
			.where({
				_time: Between(from, to)
			})
			.orderBy({
				time: 'ASC'
			})
			.getMany();
	}

	async findXDaysInactive(
		since: Date,
		numberOfDays: number
	): Promise<{ publicKey: string }[]> {
		if (numberOfDays <= 1)
			throw new Error(
				'numberOfDays must be at least 2 to archive reliably with current query'
			);

		return this.baseRepository
			.createQueryBuilder()
			.distinct(true)
			.select('"publicKeyValue"', 'publicKey')
			.innerJoin('node', 'node', 'node.id = "nodeId"')
			.where(
				"time >= :since::timestamptz - :numberOfDays * interval '1 days'",
				{ since: since, numberOfDays: numberOfDays }
			)
			.having('sum("isActiveCount") = 0')
			.groupBy(
				'"publicKeyValue", time >= :since::timestamptz - :numberOfDays * interval \'1 days\''
			)
			.getRawMany();
	}

	async findXDaysActiveButNotValidating(
		since: Date,
		numberOfDays: number
	): Promise<{ publicKey: string }[]> {
		if (numberOfDays <= 1)
			throw new Error(
				'numberOfDays must be at least 2 to archive reliably with current query'
			);

		return this.baseRepository
			.createQueryBuilder()
			.distinct(true)
			.select('"publicKeyValue"', 'publicKey')
			.innerJoin('node', 'node', 'node.id = "nodeId"')
			.where(
				"time >= :since::timestamptz - :numberOfDays * interval '1 days'",
				{ since: since, numberOfDays: numberOfDays }
			)
			.having('sum("isActiveCount") > 0 AND sum("isValidatingCount") = 0')
			.groupBy(
				'"publicKeyValue", time >= :since::timestamptz - :numberOfDays * interval \'1 days\''
			)
			.getRawMany();
	}

	async rollup(fromCrawlId: number, toCrawlId: number) {
		await this.baseRepository.query(
			`INSERT INTO node_measurement_day_v2 (time, "nodeId", "isActiveCount", "isValidatingCount",
												  "isFullValidatorCount", "isOverloadedCount", "indexSum",
												  "historyArchiveErrorCount", "crawlCount")
			 with crawls as (select date_trunc('day', NetworkScan."time") "crawlDay",
									count(distinct NetworkScan2.id)       "crawlCount"
							 from network_scan NetworkScan
									  join network_scan NetworkScan2
										   on date_trunc('day', NetworkScan."time") = date_trunc('day', NetworkScan2."time") AND
											  NetworkScan2.completed = true
							 WHERE NetworkScan.id BETWEEN $1 AND $2
							   and NetworkScan.completed = true
							 group by "crawlDay")
			 select date_trunc('day', NetworkScan."time") "day",
					"nodeId",
					sum("isActive"::int)                      "isActiveCount",
					sum("isValidating"::int)                  "isValidatingCount",
					sum("isFullValidator"::int)               "isFullValidatorCount",
					sum("isOverLoaded"::int)                  "isOverloadedCount",
					sum("index"::int)                         "indexSum",
					sum("historyArchiveHasError"::int)        "historyArchiveErrorCount",
					"crawls"."crawlCount"                    as "crawlCount"
			 FROM "network_scan" NetworkScan
					  join crawls on crawls."crawlDay" = date_trunc('day', NetworkScan."time")
					  join node_measurement_v2 on node_measurement_v2."time" = NetworkScan."time"
			 WHERE NetworkScan.id BETWEEN $1 AND $2
			   AND NetworkScan.completed = true
			 group by day, "nodeId", "crawlCount"
			 ON CONFLICT (time, "nodeId") DO UPDATE
				 SET "isActiveCount"            = node_measurement_day_v2."isActiveCount" + EXCLUDED."isActiveCount",
					 "isValidatingCount"        = node_measurement_day_v2."isValidatingCount" +
												  EXCLUDED."isValidatingCount",
					 "isFullValidatorCount"     = node_measurement_day_v2."isFullValidatorCount" +
												  EXCLUDED."isFullValidatorCount",
					 "isOverloadedCount"        = node_measurement_day_v2."isOverloadedCount" +
												  EXCLUDED."isOverloadedCount",
					 "indexSum"                 = node_measurement_day_v2."indexSum" + EXCLUDED."indexSum",
					 "historyArchiveErrorCount" = node_measurement_day_v2."historyArchiveErrorCount" +
												  EXCLUDED."historyArchiveErrorCount",
					 "crawlCount"               = EXCLUDED."crawlCount"`,
			[fromCrawlId, toCrawlId]
		);
	}
}
