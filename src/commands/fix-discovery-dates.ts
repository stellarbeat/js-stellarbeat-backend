import {jsonStorage} from "@stellarbeat/js-stellar-node-crawler";
import {NodeRepository} from "../node-repository";
require('dotenv').config();
//import {Node} from "@stellarbeat/js-stellar-domain";

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {

    if (process.argv.length <= 2) {
        console.log("Usage: " + __filename + " NODES.JSON_PATH ");

        process.exit(-1);
    }
    let nodesJsonPath = process.argv[2];

    console.log("[MAIN] Reading NODES.JSON_PATH");
    let seedNodes = await jsonStorage.getNodesFromFile(nodesJsonPath);

    let nodeRepository = new NodeRepository();
    for (let node of seedNodes) {
        let dbNode = null;
        try {
             dbNode = await nodeRepository.findByPublicKey(node.publicKey);
        }
        catch (e) {
            console.log(e);
        }
        if(dbNode === null)
            continue;

        if(dbNode.dateDiscovered > node.dateDiscovered) {
            console.log(dbNode.displayName + " has earlier discovery date");
            console.log(node.dateDiscovered);
            console.log(dbNode.dateDiscovered);
            dbNode.dateDiscovered = node.dateDiscovered;
            console.log(dbNode.dateDiscovered);
            await nodeRepository.updateNode(dbNode);
        }
    }
    await nodeRepository.destroyConnection();
}