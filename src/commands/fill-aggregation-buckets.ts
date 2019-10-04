import {createConnection, getCustomRepository} from "typeorm";
import Crawl from "../entities/Crawl";
import NodeMeasurement24HourAggregation from "../entities/NodeMeasurement24HourAggregation";
import NodeStorage from "../entities/NodeStorage";
import {PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeMeasurement30DaysAggregation from "../entities/NodeMeasurement30DaysAggregation";
/*import NodeStorage from "../entities/NodeStorage";
import {Node, PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeMeasurement24HourAggregation from "../entities/NodeMeasurement24HourAggregation";
*/
// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
    let connection = await createConnection();

    let buckets24Hours = await connection
        .getRepository(Crawl)
        .createQueryBuilder("crawl")
        .select("date_trunc('hour', time)", "hour")
        .addSelect("min(time)", "minId")
        .addSelect("max(time)", "maxId")
        .addSelect("count(id)", "count")
        .where("time >= NOW() - interval '1' day")
        .groupBy("date_trunc('hour', time)")
        .orderBy("date_trunc('hour', time)")
        .getRawMany();

    let buckets30Days = await connection
        .getRepository(Crawl)
        .createQueryBuilder("crawl")
        .select("date_trunc('day', time)", "day")
        .addSelect("min(id)", "minId")
        .addSelect("max(id)", "maxId")
        .addSelect("count(id)", "count")
        .where("time >= NOW() - interval '30' day")
        .andWhere("completed = true")
        .groupBy("date_trunc('day', time)")
        .orderBy("date_trunc('day', time)")
        .getRawMany();

    let aggregations30D = new Map<PublicKey, NodeMeasurement30DaysAggregation>();
    for (let index in buckets30Days) {
        let isValidatingCounts = await connection
            .getRepository(NodeStorage)
            .createQueryBuilder("node")
            .select('"nodeJson"->\'publicKey\'', 'publicKey')
            .addSelect('sum(("nodeJson"->>\'isValidating\')::boolean::int)', 'isValidatingCount')
            .addSelect(':nrOfCrawls', "nrOfCrawls")
            .addSelect(":day", "day")
            .innerJoin("crawl", "crawl", "crawl.id = node.crawl and crawl.completed = true")
            .andWhere("node.crawl >= :min AND node.crawl <= :max", {
                min: buckets30Days[index].minId,
                max: buckets30Days[index].maxId,
                day: buckets30Days[index].day,
                nrOfCrawls: buckets30Days[index].count
            })
            .groupBy('"nodeJson"->\'publicKey\'')
            .getRawMany();

        isValidatingCounts.forEach(count => {
            if (!aggregations30D.get(count.publicKey)) {
                aggregations30D.set(count.publicKey, new NodeMeasurement30DaysAggregation(
                    count.publicKey,
                    "isValidating",
                    0,
                    new Date(count.day)
                ))
            }
            let agg = aggregations30D.get(count.publicKey);
            agg!.fillBucket(count.isValidatingCount, count.nrOfCrawls, new Date(count.day));
        })
    }

    let aggregations24H = new Map<PublicKey, NodeMeasurement24HourAggregation>();
    for (let index in buckets24Hours) {
        let isValidatingCounts = await connection
            .getRepository(NodeStorage)
            .createQueryBuilder("node")
            .select('"nodeJson"->\'publicKey\'', 'publicKey')
            .addSelect('sum(("nodeJson"->>\'isValidating\')::boolean::int)', 'isValidatingCount')
            .addSelect(':nrOfCrawls', "nrOfCrawls")
            .addSelect(":hour", "hour")
            .innerJoin("crawl", "crawl", "crawl.id = node.crawl and crawl.completed = true")
            .andWhere("node.crawl >= :min AND node.crawl <= :max", {
                min: buckets24Hours[index].minId,
                max: buckets24Hours[index].maxId,
                hour: buckets24Hours[index].hour,
                nrOfCrawls: buckets24Hours[index].count
            })
            .groupBy('"nodeJson"->\'publicKey\'')
            .getRawMany();

        isValidatingCounts.forEach(count => {
            if (!aggregations24H.get(count.publicKey)) {
                aggregations24H.set(count.publicKey, new NodeMeasurement24HourAggregation(
                    count.publicKey,
                    "isValidating",
                    0,
                    new Date(count.hour)
                ))
            }
            let agg = aggregations24H.get(count.publicKey);
            agg!.fillBucket(count.isValidatingCount, count.nrOfCrawls, new Date(count.hour));
        })
    }
    console.log(aggregations30D.size);
    console.log(aggregations24H.size);
    await connection.close();
    //save aggregations to database.
    console.log("done");
}

