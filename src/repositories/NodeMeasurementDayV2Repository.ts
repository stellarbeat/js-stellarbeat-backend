import {EntityRepository, Repository} from "typeorm";
import NodeMeasurementDayV2 from "../entities/NodeMeasurementDayV2";
import NodePublicKeyStorage from "../entities/NodePublicKeyStorage";

export interface IMeasurementRollupRepository {
    findBetween(nodePublicKeyStorage: NodePublicKeyStorage, from: Date, to: Date): Promise<any[]>;
    rollup(fromCrawlId: number, toCrawlId: number): void;
}

@EntityRepository(NodeMeasurementDayV2)
export class NodeMeasurementDayV2Repository extends Repository<NodeMeasurementDayV2> implements IMeasurementRollupRepository{

    async findBetween(nodePublicKeyStorage: NodePublicKeyStorage, from: Date, to: Date) {
        return this.query('with measurements as (\n' +
            '    SELECT "NodeMeasurementDay"."day",\n' +
            '           "NodeMeasurementDay"."publicKey",\n' +
            '           "NodeMeasurementDay"."isValidatingCount",\n' +
            '           "NodeMeasurementDay"."crawlCount"\n' +
            '    FROM "crawl_v2" "CrawlV2"' +
            '    JOIN "node_measurement_day" "NodeMeasurementDay" ON "CrawlV2"."id" = "NodeMeasurementDay"."CrawlId"\n' +
            '    WHERE "nodePublicKeyStorageId" = $1\n' +
            '      AND "day" >= date_trunc(\'day\', $2::timestamp)\n' +
            '      and "day" <= date_trunc(\'day\', $3::timestamp)\n' +
            ') select d.day, $1 "publicKey", coalesce("isValidatingCount", 0) "isValidatingCount", coalesce("crawlCount",0) "crawlCount"\n' +
            'from (select generate_series( date_trunc(\'day\', $2::TIMESTAMP), date_trunc(\'day\', $3::TIMESTAMP), interval \'1 day\')) d(day)\n' +
            '        LEFT OUTER JOIN measurements on d.day = measurements.day\n',
            [nodePublicKeyStorage.id, from, to]);
    }

    async findThirtyDayInactive(since: Date):Promise<{nodePublicKeyStorageId: number}[]>{
        return this.createQueryBuilder().distinct(true)
            .select('"nodePublicKeyStorageId"')
            .where('day >= :since::timestamptz - interval \'31 days\'', {since: since})
            .having('sum("isActiveCount") = 0')
            .groupBy('"nodePublicKeyStorageId", day >= :since::timestamptz - interval \'31 days\'')
            .getRawMany();
    }

    async findValidatorsThirtyDaysNotValidating():Promise<{nodePublicKeyStorageId: number}[]>{
        return this.createQueryBuilder('NodeMeasurementDayV2').distinct(true)
            .select('"NodeSnapShot"."id"')
            .innerJoin('node_snap_shot', 'NodeSnapShot',
                '"NodeSnapShot"."NodePublicKeyId" = "NodeMeasurementDayV2"."nodePublicKeyStorageId" ' +
                'AND "NodeSnapShot"."EndCrawlId" is null ' + //active snapshot
                'AND "NodeSnapShot"."QuorumSetId" is not null') //validator has quorumSet
            .where('day >= NOW() - interval \'31 days\'')
            .having('sum("isValidatingCount") = 0')
            .groupBy('"NodeSnapShot"."id"')
            .getRawMany();
    }

    async rollup(fromCrawlId: number, toCrawlId: number) {
        await this.query("INSERT INTO node_measurement_day_v2 (day, \"nodePublicKeyStorageId\", \"isActiveCount\", \"isValidatingCount\", \"isFullValidatorCount\", \"isOverloadedCount\", \"indexSum\", \"nodeCrawlCount\")\n" +
            "select date_trunc('day', \"validFrom\") \"day\",\n" +
            "       \"nodePublicKeyStorageId\",\n" +
            "       sum(\"isActive\"::int) \"isActiveCount\",\n" +
            "       sum(\"isValidating\"::int) \"isValidatingCount\",\n" +
            "       sum(\"isFullValidator\"::int) \"isFullValidatorCount\",\n" +
            "       sum(\"isOverLoaded\"::int) \"isOverloadedCount\",\n" +
            "       sum(\"index\"::int) \"indexSum\",\n" +
            "       count(*) \"nodeCrawlCount\"\n" +
            '    FROM "crawl_v2" "CrawlV2"' +
            "join node_measurement_v2 on node_measurement_v2.\"crawlId\" = \"CrawlV2\".id\n" +
            "    WHERE \"CrawlV2\".id BETWEEN $1 AND $2 AND \"CrawlV2\".completed = true\n" +
            "group by day, \"nodePublicKeyStorageId\"\n" +
            "ON CONFLICT (day, \"nodePublicKeyStorageId\") DO UPDATE\n" +
            "SET\n" +
            "    \"isActiveCount\" = node_measurement_day_v2.\"isActiveCount\" + EXCLUDED.\"isActiveCount\",\n" +
            "    \"isValidatingCount\" = node_measurement_day_v2.\"isValidatingCount\" + EXCLUDED.\"isValidatingCount\",\n" +
            "    \"isFullValidatorCount\" = node_measurement_day_v2.\"isFullValidatorCount\" + EXCLUDED.\"isFullValidatorCount\",\n" +
            "    \"isOverloadedCount\" = node_measurement_day_v2.\"isOverloadedCount\" + EXCLUDED.\"isOverloadedCount\",\n" +
            "    \"indexSum\" = node_measurement_day_v2.\"indexSum\" + EXCLUDED.\"indexSum\",\n" +
            "    \"nodeCrawlCount\" = node_measurement_day_v2. \"nodeCrawlCount\" + EXCLUDED.\"nodeCrawlCount\"",
            [fromCrawlId, toCrawlId]);
    }
}