import {EntityRepository, Repository} from "typeorm";
import NodeMeasurement from "../entities/NodeMeasurement";

export interface MeasurementAverage {
    public_key:string,
    active_avg:string,
    validating_avg: string,
    over_loaded_avg: string
}

@EntityRepository(NodeMeasurement)
export class NodeMeasurementRepository extends Repository<NodeMeasurement> {

    findByTime(time: Date) {
        return this.findOne({ time });
    }

    findActivityValidatingAndLoadCountLatestXDays(days:number):Promise<MeasurementAverage[]> {
        return this.query('WITH crawl_count AS (' +
            '    SELECT count(*) AS "nr_of_crawls" FROM "crawl" "Crawl" ' +
            'WHERE time >=  NOW() - interval \'' +  days + '\' day' +
            ')' +
            '        SELECT "publicKey" as public_key,' +
            '               ROUND(100.0*(sum("isActive"::int::decimal )/nr_of_crawls),2) as active_avg,' +
            '               ROUND(100.0*(sum("isValidating"::int::decimal )/nr_of_crawls),2) as validating_avg,' +
            '               ROUND(100.0*(sum("isOverLoaded"::int::decimal )/nr_of_crawls),2) as over_loaded_avg' +
            '        FROM "node_measurement" "NodeMeasurement", crawl_count' +
            '        WHERE time >= NOW() - interval \'' +  days + '\' day' +
            '        GROUP BY "publicKey", nr_of_crawls'
        );
    }

    async findValidatorClusterAvailabilityLatestXDays(days:number, validators: string[], threshold: number):Promise<number> {
        let result = await this.query('WITH crawl_count AS\n' +
            '         (SELECT count(*) AS "nr_of_crawls"\n' +
            '          FROM "crawl" "Crawl"\n' +
            '          WHERE time >= NOW() - interval \'' +  days + '\' day),\n' +
            '     availability AS (\n' +
            '    SELECT time, 1.0 as is_available\n' +
            'FROM "node_measurement" "NodeMeasurement"\n' +
            'WHERE "publicKey" in (' + validators.map(validator => "'" + validator + "'").toString() + ') and\n' +
            '      time >= NOW() - interval \'' +  days + '\' day\n' +
            'GROUP BY  "time"\n' +
            'having sum("isValidating"::int::decimal) >= ' + threshold + ')\n' +
            'select ROUND(100.0*count(is_available)/nr_of_crawls, 2) as availability\n' +
            'from availability, crawl_count\n' +
            'group by nr_of_crawls');

        if(result && result.length === 1) {
            return Number(result[0].availability);
        }

        return 0;
    }
}