import {EntityRepository, Repository} from "typeorm";
import NodeMeasurementV2 from "../entities/NodeMeasurementV2";

export interface NodeMeasurementV2Average {
    nodeStoragePublicKeyId: number,
    activeAvg: number,
    validatingAvg: number,
    fullValidatorAvg: number,
    overLoadedAvg: number,
    indexAvg: number
}

@EntityRepository(NodeMeasurementV2)
export class NodeMeasurementV2Repository extends Repository<NodeMeasurementV2> {

    findXDaysAverageAt(at: Date, days:number):Promise<NodeMeasurementV2Average[]> {
        return this.query('WITH crawl_count AS (' +
            '    SELECT count(*) AS "nr_of_crawls" FROM "crawl_v2" "CrawlV2" ' +
            'WHERE validFrom >=  $1::TIMESTAMP - interval \'' +  days + '\' day ' +
            'AND completed = true ' +
            ')' +
            '        SELECT "NodePublicKeyStorageId" as nodeStoragePublicKeyId,' +
            '               ROUND(100.0*(sum("isActive"::int::decimal )/nr_of_crawls),2) as "activeAvg",' +
            '               ROUND(100.0*(sum("isValidating"::int::decimal )/nr_of_crawls),2) as "validatingAvg",' +
            '               ROUND(100.0*(sum("isOverLoaded"::int::decimal )/nr_of_crawls),2) as "overLoadedAvg"' +
            '               ROUND(100.0*(sum("fullValidatorAvg"::int::decimal )/nr_of_crawls),2) as "fullValidatorAvg"' +
            '               ROUND(100.0*(sum("indexAvg"::int::decimal )/nr_of_crawls),2) as "indexAvg"' +
            '        FROM "node_measurement_v2" "NodeMeasurementV2", crawl_count' +
            '        WHERE time >= $1::TIMESTAMP - interval \'' +  days + '\' day' +
            '        GROUP BY "nodeStoragePublicKeyId", nr_of_crawls',
            [at]
        );
    }
}