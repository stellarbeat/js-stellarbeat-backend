import {EntityRepository, Repository} from "typeorm";
import NodeMeasurement from "../entities/NodeMeasurement";
import {PublicKey} from "@stellarbeat/js-stellar-domain"

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

    findAggregatedStatsOverXDaysForNode(publicKey: PublicKey, fromDate: Date, endDate: Date) {
        return this.query('' +
            'with crawlcounts as (\n' +
            '    select date_trunc(\'day\', time) "day", count(*) "mycount" ' +
            'from crawl WHERE time >= $2::TIMESTAMP and time <= $3::TIMESTAMP and completed = true group by "day"\n' +
            '), nodedaycounts as (\n' +
            '    select date_trunc(\'day\', "NodeMeasurement".time) "day",\n' +
            '           ROUND(100.0 * (sum("isActive"::int::decimal) / mycount), 2) "active",\n' +
            '           ROUND(100.0 * (sum("isValidating"::int::decimal) / mycount), 2) "validating",\n' +
            '           ROUND(100.0 * (sum("isOverLoaded"::int::decimal) / mycount), 2) "overloaded"\n' +
            '    from "node_measurement" "NodeMeasurement"\n' +
            '    join crawlcounts on crawlcounts.day = date_trunc(\'day\', "NodeMeasurement".time)\n' +
            '    join crawl "Crawl" on "Crawl".time = "NodeMeasurement".time and "Crawl".completed = true\n' +
            '    WHERE "NodeMeasurement".time  >= $2::TIMESTAMP and "NodeMeasurement".time <= $3::TIMESTAMP ' +
            'and "publicKey" = $1::text\n' +
            '    group by date_trunc(\'day\', "NodeMeasurement".time), "publicKey", "mycount"\n' +
            ')\n' +
            'select d.day, coalesce(active, \'0.00\') active, coalesce(validating, \'0.00\') validating, coalesce(overloaded, \'0.00\') overloaded\n' +
            'from  (select generate_series( date_trunc(\'day\', $2::TIMESTAMP), date_trunc(\'day\', $3::TIMESTAMP), interval \'1 day\')) d(day)\n' +
            '          LEFT OUTER JOIN nodedaycounts on d.day = nodedaycounts.day'
        , [publicKey, fromDate.toUTCString(), endDate.toUTCString()]);
    }

    findActivityValidatingAndLoadCountLatestXDays(days:number):Promise<MeasurementAverage[]> {
        return this.query('WITH crawl_count AS (' +
            '    SELECT count(*) + 1 AS "nr_of_crawls" FROM "crawl" "Crawl" ' + // +1 because current crawl is not yet completed
            'WHERE time >=  NOW() - interval \'' +  days + '\' day ' +
            'AND completed = true ' +
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
            '         (SELECT count(*) + 1 AS "nr_of_crawls"\n' +
            '          FROM "crawl" "Crawl"\n' +
            '          WHERE time >= NOW() - interval \'' +  days + '\' day' +
            '          AND completed = true), ' +
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