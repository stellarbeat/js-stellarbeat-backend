const Node = require("@stellarbeat/js-stellar-domain").Node;
const fs = require('await-fs');

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
    let nodesJSON = await fs.readFile("./seeds/old-nodes.json");
    let nodesRaw = JSON.parse(nodesJSON);

    let nodes = nodesRaw.map((node) => {
        let newNode = Node.fromJSON(node);
        newNode.geoData.countryCode = node.countryCode;
        newNode.geoData.countryName = node.countryName;
        newNode.geoData.regionCode = node.regionCode;
        newNode.geoData.regionName = node.regionName;
        newNode.geoData.city = node.city;
        newNode.geoData.zipCode = node.zipCode;
        newNode.geoData.timeZone = node.timeZone;
        newNode.geoData.latitude = node.latitude;
        newNode.geoData.longitude = node.longitude;
        newNode.geoData.metroCode = node.metroCode;

        newNode.statistics.activeCounter = node.activeCounter;
        return newNode;
    });

    await fs.writeFile("./seeds/nodes.json", JSON.stringify(nodes));
}