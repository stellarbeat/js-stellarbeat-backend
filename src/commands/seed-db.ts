import {CrawlResultProcessor} from "../services/CrawlResultProcessor";

const fs = require('await-fs');
import {Node} from '@stellarbeat/js-stellar-domain';
import CrawlV2 from "../entities/CrawlV2";
import Kernel from "../Kernel";
import {Connection} from "typeorm";
// noinspection JSIgnoredPromiseFromCall
main();

async function main() {

    if (process.argv.length <= 2) {
        console.log("Usage: " + __filename + " nodes.json");

        process.exit(-1);
    }
    let nodesPath = process.argv[2];
    let nodesJSON = await fs.readFile(nodesPath);
    let nodesRaw = JSON.parse(nodesJSON);

    let nodes:Node[] = nodesRaw.map((node:any):Node => {
        return Node.fromJSON(node);
    });
    let kernel = new Kernel();
    await kernel.initializeContainer();
    let crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
    let crawlV2 = new CrawlV2(new Date());
    await crawlResultProcessor.processCrawl(crawlV2, nodes, []);

    await kernel.container.get(Connection).close();
}