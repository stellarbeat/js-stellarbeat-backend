"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
//@flow
require('dotenv').config();
const node_repository_1 = require("../node-repository");
const index_1 = require("../index");
const js_stellar_node_crawler_1 = require("@stellarbeat/js-stellar-node-crawler");
const axios_1 = require("axios");
const AWS = require("aws-sdk");
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
const stellarDashboard = require("./../stellar-dashboard");
let nodeRepository = new node_repository_1.NodeRepository();
// noinspection JSIgnoredPromiseFromCall
run();
function run() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        while (true) {
            console.time('backend');
            console.log("[MAIN] Fetching known nodes from database");
            let nodesSeed = yield nodeRepository.findAllNodes();
            let crawler = new js_stellar_node_crawler_1.Crawler(true, 5000);
            console.log("[MAIN] Starting Crawler");
            let nodes = yield crawler.crawl(nodesSeed);
            nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys
            nodes = removeDuplicatePublicKeys(nodes);
            console.log("[MAIN] Fetch toml files");
            let tomlService = new index_1.TomlService();
            yield Promise.all(nodes.filter(node => node.active).map((node) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    let toml = yield tomlService.fetchToml(node);
                    if (toml === undefined) {
                        return;
                    }
                    console.log(node.displayName);
                    let name = tomlService.getNodeName(node.publicKey, toml);
                    if (name !== undefined) {
                        node.name = name;
                    }
                    let historyUrls = tomlService.getHistoryUrls(toml);
                    let historyIsUpToDate = false;
                    let counter = 0;
                    let historyService = new index_1.HistoryService();
                    while (!historyIsUpToDate && counter < historyUrls.length) {
                        let stellarHistory = yield historyService.fetchStellarHistory(historyUrls[counter]);
                        if (stellarHistory !== undefined)
                            historyIsUpToDate = yield historyService.stellarHistoryIsUpToDate(stellarHistory);
                        counter++;
                    }
                    if (historyIsUpToDate) {
                        Sentry.captureMessage("Full validator found!! Publickey: " + node.publicKey);
                    }
                }
                catch (e) {
                    Sentry.captureException(e);
                }
            })));
            console.log("[MAIN] Starting map to stellar dashboard information");
            nodes = yield mapStellarDashboardNodes(nodes);
            console.log("[MAIN] Starting geo data fetch");
            nodes = yield fetchGeoData(nodes);
            console.log("[MAIN] Archive to S3");
            yield archiveToS3(nodes);
            console.log('[MAIN] Archive to S3 completed');
            console.log("[MAIN] Adding/updating nodes in database");
            //todo: need a way to handle nodes that change public keys. Switching back to pruning db until this is solved.
            console.log("[MAIN] Truncating database");
            yield nodeRepository.deleteAllNodes();
            console.log("[MAIN] Adding nodes to database");
            yield Promise.all(nodes.map((node) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    yield nodeRepository.addNode(node);
                }
                catch (e) {
                    Sentry.captureException(e);
                }
            })));
            let backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
            let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
            if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
                throw "Backend cache not configured";
            }
            console.log('[MAIN] clearing api cache');
            yield axios_1.default.get(backendApiClearCacheUrl + "?token=" + backendApiClearCacheToken);
            console.log('[MAIN] api cache cleared');
            let deadManSwitchUrl = process.env.DEADMAN_URL;
            if (deadManSwitchUrl) {
                console.log('[MAIN] Contacting deadmanswitch');
                yield axios_1.default.get(deadManSwitchUrl);
            }
            console.timeEnd('backend');
            console.log("end of backend run");
        }
    });
}
function mapStellarDashboardNodes(nodes) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let dashboardNodes = yield stellarDashboard.importNodes();
        nodes.forEach((node) => {
            let knownNode = dashboardNodes.find((knownNode) => {
                return node.publicKey === knownNode.publicKey;
            });
            if (knownNode) {
                node.name = knownNode.name;
                node.host = knownNode.host;
            }
        });
        return nodes;
    });
}
function fetchGeoData(nodes) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let nodesToProcess = nodes.filter((node) => {
            "use strict";
            return node.geoData.latitude === undefined;
        });
        yield Promise.all(nodesToProcess.map((node) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            Sentry.captureMessage("fetching geo data for: " + node.publicKey);
            let accessKey = process.env.IPSTACK_ACCESS_KEY;
            if (!accessKey) {
                throw "ERROR: ipstack not configured";
            }
            let url = "http://api.ipstack.com/" + node.ip + '?access_key=' + accessKey;
            let geoDataResponse = yield axios_1.default.get(url);
            let geoData = geoDataResponse.data;
            node.geoData.countryCode = geoData.country_code;
            node.geoData.countryName = geoData.country_name;
            node.geoData.regionCode = geoData.region_code;
            node.geoData.regionName = geoData.region_name;
            node.geoData.city = geoData.city;
            node.geoData.zipCode = geoData.zip_code;
            node.geoData.timeZone = geoData.time_zone;
            node.geoData.latitude = geoData.latitude;
            node.geoData.longitude = geoData.longitude;
            node.geoData.metroCode = geoData.metro_code;
        })));
        return nodes;
    });
}
function archiveToS3(nodes) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let accessKeyId = process.env.AWS_ACCESS_KEY;
        let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let bucketName = process.env.AWS_BUCKET_NAME;
        let environment = process.env.NODE_ENV;
        if (!accessKeyId) {
            return "Not archiving, s3 not configured";
        }
        let currentTime = new Date();
        let params = {
            Bucket: bucketName,
            Key: environment + "/"
                + currentTime.getFullYear()
                + "/" + currentTime.toLocaleString("en-us", { month: "short" })
                + "/" + currentTime.toISOString()
                + ".json",
            Body: JSON.stringify(nodes)
        };
        let s3 = new AWS.S3({
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });
        return yield s3.upload(params).promise();
    });
}
function removeDuplicatePublicKeys(nodes) {
    //filter out double public keys (nodes that switched ip address, or have the same public key running on different ip's at the same time)
    //statistics are lost because new ip
    let publicKeys = nodes.map((node) => node.publicKey);
    let duplicatePublicKeys = [];
    publicKeys.forEach((element, index) => {
        // Find if there is a duplicate or not
        if (publicKeys.indexOf(element, index + 1) > -1) {
            // Is the duplicate already registered?
            if (duplicatePublicKeys.indexOf(element) === -1) {
                duplicatePublicKeys.push(element);
            }
        }
    });
    duplicatePublicKeys.forEach(duplicatePublicKey => {
        console.log('duplicate publicKey: ' + duplicatePublicKey);
        let duplicateNodes = nodes.filter(node => node.publicKey === duplicatePublicKey);
        let nodeToKeep = duplicateNodes[0];
        let nodesToDiscard = [];
        for (let i = 1; i < duplicateNodes.length; i++) {
            if (duplicateNodes[i].dateDiscovered > nodeToKeep.dateDiscovered) {
                nodesToDiscard.push(nodeToKeep);
                nodeToKeep = duplicateNodes[i];
            }
            else {
                nodesToDiscard.push(duplicateNodes[i]);
            }
        }
        let nodeWithName = duplicateNodes.find(node => node.name !== undefined && node.name !== null);
        if (nodeWithName !== undefined) {
            nodeToKeep.name = nodeWithName.name;
        }
        let nodeWithHost = duplicateNodes.find(node => node.host !== undefined && node.host !== null);
        if (nodeWithHost !== undefined) {
            nodeToKeep.host = nodeWithHost.host;
        }
        let nodeWithGeoData = duplicateNodes.find(node => node.geoData.longitude !== undefined && node.geoData.longitude !== null);
        if (nodeWithGeoData !== undefined) {
            nodeToKeep.geoData = nodeWithGeoData.geoData;
        }
        nodesToDiscard.forEach(nodeToDiscard => {
            let index = nodes.indexOf(nodeToDiscard);
            if (index > -1) {
                nodes.splice(index, 1);
            }
        });
    });
    return nodes;
}
//# sourceMappingURL=update-nodes.js.map