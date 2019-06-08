
const fs = require('await-fs');
import {Node} from '@stellarbeat/js-stellar-domain';
import {createConnection, getCustomRepository} from "typeorm";
import Crawl from "../entities/Crawl";
import NodeStorage from "../entities/NodeStorage";
import {CrawlRepository} from "../repositories/CrawlRepository";

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

    //nodes = nodes.filter((node:Node) => node.publicKey);

    let connection = await createConnection();
    let crawlRepository = getCustomRepository(CrawlRepository);
    let crawl = new Crawl();
    await crawlRepository.save(crawl);
    for (let index in nodes) {
        let nodeStorage = new NodeStorage(crawl, nodes[index]);
        await connection.manager.save(nodeStorage);
    }
}