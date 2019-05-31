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
            'WHERE time >= current_date - interval \'' +  days + '\' day' +
            ')' +
            '        SELECT "publicKey" as public_key,' +
            '               ((100*sum("isActive"::int ))/nr_of_crawls) as active_avg,' +
            '               ((100*sum("isValidating"::int ))/nr_of_crawls) as validating_avg,' +
            '               ((100*sum("isOverLoaded"::int ))/nr_of_crawls) as over_loaded_avg' +
            '        FROM "node_measurement" "NodeMeasurement", crawl_count' +
            '        WHERE time >= current_date - interval \'' +  days + '\' day' +
            '        GROUP BY "publicKey", nr_of_crawls'
        );
    }
}