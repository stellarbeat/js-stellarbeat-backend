import {EntityRepository, Repository} from "typeorm";
import Crawl from "../entities/Crawl";
//import NodeStorage from "../entities/NodeStorage";

@EntityRepository(Crawl)
export class CrawlRepository extends Repository<Crawl> {

    findByTime(time: Date) {
        return this.findOne({ time });
    }

    findMaxCrawlIdInBucket(){

    }

    findNodesStartingFromCrawlId(crawlId: number) {
        return this.query('SELECT "nodeJson" from node where "crawlId">=latest_crawl')
    }

    findNodesFromLatestCrawl():Promise<[{nodeJson:string}]>{
        return this.query('WITH latest_crawl AS (' +
            'SELECT id AS "latest_crawl" ' +
            'FROM "crawl" "Crawl" ' +
            'WHERE completed = true ' +
            'order by time desc ' +
            'limit 1' +
            ') ' +
            'SELECT "nodeJson" from node,latest_crawl where "crawlId"=latest_crawl'
        );
    }

    findOrganizationsFromLatestCrawl():Promise<[{organizationJson:string}]>{
        return this.query('WITH latest_crawl AS (' +
            'SELECT id AS "latest_crawl" ' +
            'FROM "crawl" "Crawl" ' +
            'WHERE completed = true ' +
            'order by time desc ' +
            'limit 1' +
            ') ' +
            'SELECT "organizationJson" from organization,latest_crawl where "crawlId"=latest_crawl'
        );
    }

    countLatestXDays(days: number) {
        return this.createQueryBuilder()
            .select("count(*)", "count")
            .where("time >= NOW() - interval \'" +  days + "\' day")
            .andWhere("completed = true")
            .printSql()
            .getRawOne();
    }
}