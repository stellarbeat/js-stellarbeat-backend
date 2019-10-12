import {EntityRepository, Repository} from "typeorm";
import NodeMeasurementDay from "../entities/NodeMeasurementDay";

@EntityRepository(NodeMeasurementDay)
export class NodeMeasurementDayRepository extends Repository<NodeMeasurementDay> {
    /*
    Adds validating counts to the previous counts.
    Sets the numberOfCrawls to the total number of crawls those days (not total number of crawls of the specific node)
     */
    async updateCounts(fromCrawlId: number, toCrawlId: number){
        await this.query("INSERT INTO node_measurement_day (day, \"publicKey\", \"isValidatingCount\", \"crawlCount\")\n" +
            "    with crawls as (\n" +
            "        select date_trunc('day', \"Crawl\".time) \"crawlDay\", count(distinct \"Crawl2\".id) \"crawlCount\"\n" +
            "        from  crawl \"Crawl\"\n" +
            "        join crawl \"Crawl2\" on date_trunc('day', \"Crawl\".time) = date_trunc('day', \"Crawl2\".time) AND \"Crawl2\".completed = true\n" +
            "        WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "        group by \"crawlDay\"\n" +
            "    )\n" +
            "    select date_trunc('day', \"Crawl\".time) \"day\",\n" +
            "           \"publicKey\",\n" +
            "           sum(\"isValidating\"::int) \"validating\",\n" +
            "           \"crawlCount\"\n" +
            "    from crawl \"Crawl\"\n" +
            "             join crawls on crawls.\"crawlDay\" = date_trunc('day', \"Crawl\".time)\n" +
            "             join \"node_measurement\" \"NodeMeasurement\" on \"Crawl\".time = \"NodeMeasurement\".time\n" +
            "    WHERE \"Crawl\".id BETWEEN " + fromCrawlId + " AND " + toCrawlId + " and \"Crawl\".completed = true\n" +
            "    group by day, \"publicKey\", \"crawlCount\"\n" +
            "    ON CONFLICT (day, \"publicKey\") DO UPDATE\n" +
            "        SET \"isValidatingCount\" = node_measurement_day.\"isValidatingCount\" + EXCLUDED.\"isValidatingCount\", \"crawlCount\" = EXCLUDED.\"crawlCount\"");
    }
}