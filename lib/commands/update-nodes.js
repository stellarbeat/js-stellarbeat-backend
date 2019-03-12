"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//@flow
require('dotenv').config();
const node_repository_1 = require("../node-repository");
const js_stellar_node_crawler_1 = require("@stellarbeat/js-stellar-node-crawler");
const axios_1 = require("axios");
const AWS = require("aws-sdk");
const querystring = require("querystring");
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
const stellarDashboard = require("./../stellar-dashboard");
// noinspection JSIgnoredPromiseFromCall
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let notifyDeadManSwitch = process.argv[2] ? process.argv[2] : false;
        console.log("[MAIN] Fetching known nodes from database");
        let nodesSeed = yield node_repository_1.default.findAllNodes();
        let crawler = new js_stellar_node_crawler_1.Crawler(true, 5000);
        console.log("[MAIN] Starting Crawler");
        let nodes = yield crawler.crawl(nodesSeed);
        nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys
        console.log("[MAIN] Starting map to stellar dashboard information");
        nodes = yield mapStellarDashboardNodes(nodes);
        console.log("[MAIN] Starting geo data fetch");
        nodes = yield fetchGeoData(nodes);
        console.log("[MAIN] Archive to S3");
        yield archiveToS3(nodes);
        console.log('[MAIN] Archive to S3 completed');
        console.log("[MAIN] Truncating database");
        yield node_repository_1.default.deleteAllNodes();
        console.log("[MAIN] Adding nodes to database");
        yield Promise.all(nodes.map((node) => __awaiter(this, void 0, void 0, function* () {
            yield node_repository_1.default.addNode(node);
        })));
        yield node_repository_1.default.destroyConnection();
        let backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
        let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
        if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
            throw "Backend cache not configured";
        }
        console.log('[MAIN] clearing api cache');
        yield axios_1.default.get(backendApiClearCacheUrl + "?token=" + backendApiClearCacheToken);
        console.log('[MAIN] api cache cleared');
        if (notifyDeadManSwitch) {
            console.log('[MAIN] Contacting deadmanswitch');
            let deadManSwitchUrl = process.env.DEADMAN_URL;
            if (!deadManSwitchUrl)
                throw "error: deadmanswitch url not configured";
            yield axios_1.default.get(deadManSwitchUrl);
        }
        console.log("end of script");
    });
}
function mapStellarDashboardNodes(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
        let nodesToProcess = nodes.filter((node) => {
            "use strict";
            return node.geoData.latitude === undefined;
        });
        yield Promise.all(nodesToProcess.map((node) => __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
        let accessKeyId = process.env.AWS_ACCESS_KEY;
        let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let bucketName = process.env.AWS_BUCKET_NAME;
        let environment = process.env.NODE_ENV;
        if (!environment) {
            throw "Error: environment not configured";
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
        yield s3.upload(params).promise();
    });
}
function postNodesToStellarBeatIO(nodes) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[MAIN] Posting to StellarBeatIO");
        let payload = querystring.stringify({ "peers": JSON.stringify(nodes) });
        let url = process.env.FRONTEND_API_URL;
        if (!url)
            throw "Error: frontend not configured";
        yield axios_1.default.post(url, payload);
    });
}
//# sourceMappingURL=update-nodes.js.map