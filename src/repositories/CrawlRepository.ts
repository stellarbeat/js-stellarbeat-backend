import {EntityRepository, Repository} from "typeorm";
import Crawl from "../entities/Crawl";
//import NodeStorage from "../entities/NodeStorage";

@EntityRepository(Crawl)
export class CrawlRepository extends Repository<Crawl> {

    findByTime(time: Date) {
        return this.findOne({ time });
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