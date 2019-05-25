import {EntityRepository, Repository} from "typeorm";
import Crawl from "../entities/Crawl";

@EntityRepository(Crawl)
export class CrawlRepository extends Repository<Crawl> {

    findByTime(time: Date) {
        return this.findOne({ time });
    }

    countLatestXDays(days: number) {
        return this.createQueryBuilder()
            .select("count(*)", "count")
            .where('time >= current_date - interval \'30\' day ')
            .setParameter("days", days)
            .getRawOne();
    }
}