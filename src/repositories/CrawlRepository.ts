import {EntityRepository, Repository} from "typeorm";
import Crawl from "../entities/Crawl";
//import NodeStorage from "../entities/NodeStorage";

@EntityRepository(Crawl)
export class CrawlRepository extends Repository<Crawl> {

    findByTime(time: Date) {
        return this.findOne({ time });
    }

    findNodesFromLatestCrawl():Promise<[{nodeJson:string}]>{
        return this.query('WITH latest_crawl AS (' +
            'SELECT id AS "latest_crawl" ' +
            'FROM "crawl" "Crawl" ' +
            'order by time desc ' +
            'limit 1' +
            ') ' +
            'SELECT "nodeJson" from node,latest_crawl where "crawlId"=latest_crawl'
        );
    }

    findOrganizationsFromLatestCrawl():Promise<[{nodeJson:string}]>{
        return this.query('WITH latest_crawl AS (' +
            'SELECT id AS "latest_crawl" ' +
            'FROM "crawl" "Crawl" ' +
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
            .printSql()
            .getRawOne();
    }

    /*findActivityValidatingAndLoadCountLatestXDays(days:number) {
        return this.createQueryBuilder()
            .select("node.\"nodeJson\"->'publicKey' as publicKey, sum((node.\"nodeJson\"->>'active')::BOOLEAN::INTEGER) as activeCount, sum((node.\"nodeJson\"->>'isValidating')::BOOLEAN::INTEGER) as validatingCount, sum((node.\"nodeJson\"->>'overLoaded')::BOOLEAN::INTEGER) as overLoadedCount")
            .innerJoin(NodeStorage, 'node', "node.\"crawlId\"=Crawl.id")
            .where("time >= current_date - interval \'" +  days + "\' day")
            .groupBy("node.\"nodeJson\"->'publicKey'")
            .getRawMany()
    }*/
}