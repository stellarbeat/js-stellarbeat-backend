import {EntityRepository, Repository} from "typeorm";
import OrganizationMeasurement from "../entities/OrganizationMeasurement";

export interface OrganizationMeasurementAverageRecord {
    organizationIdStorageId: number;
    isSubQuorumAvailableAvg: string;
}

export class OrganizationMeasurementAverage {
    organizationIdStorageId: number;
    isSubQuorumAvailableAvg: number;

    constructor(organizationIdStorageId: number, isSubQuorumAvailableAvg: number) {
        this.organizationIdStorageId = organizationIdStorageId;
        this.isSubQuorumAvailableAvg = isSubQuorumAvailableAvg;
    }

    static fromDatabaseRecord(record: OrganizationMeasurementAverageRecord){
        return new this(record.organizationIdStorageId, Number(record.isSubQuorumAvailableAvg));
    }

    toString(){
        return `OrganizationMeasurementAverage (organizationIdStorageId: ${this.organizationIdStorageId}, isSubQuorumAvailableAvg: ${this.isSubQuorumAvailableAvg})`;
    }
}

@EntityRepository(OrganizationMeasurement)
export class OrganizationMeasurementRepository extends Repository<OrganizationMeasurement> {

    async findXDaysAverageAt(at: Date, xDays:number):Promise<OrganizationMeasurementAverage[]> {
        let from = new Date(at.getTime());
        from.setDate(at.getDate() - xDays);

        let result = await this.query('WITH crawl_count AS (SELECT count(*) AS "nr_of_crawls"\n' +
            '                     FROM "crawl_v2" "CrawlV2"\n' +
            '                     WHERE "validFrom" >= $1\n' +
            '                       and "validFrom" <= $2\n' +
            '                       AND completed = true)\n' +
            'SELECT "organizationIdStorageId"                      as "organizationIdStorageId",\n' +
            '       ROUND(100.0 * avg("isSubQuorumAvailable"::int), 2)        as "isSubQuorumAvailableAvg",\n' +
            '       ROUND(avg("index"::int), 2)                   as "indexAvg",\n' +
            '       count(*)                                      as "msCount"\n' +
            'FROM "organization_measurement" "OrganizationMeasurement"\n' +
            'WHERE "time" >= $1\n' +
            '  and "time" <= $2\n' +
            'GROUP BY "organizationIdStorageId"\n' +
            'having count(*) >= (select nr_of_crawls from crawl_count)',
            [from, at]
        );

        return result.map((record:OrganizationMeasurementAverageRecord) => OrganizationMeasurementAverage.fromDatabaseRecord(record));
    }
}