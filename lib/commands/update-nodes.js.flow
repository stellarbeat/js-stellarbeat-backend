//@flow
require('dotenv').config();
const NodeRepository = require("../node-repository");
const Crawler = require("@stellarbeat/js-stellar-node-crawler").Crawler;
const Node = require("@stellarbeat/js-stellar-domain").Node;
const axios = require("axios");
const AWS = require('aws-sdk');
const querystring = require('querystring');

const stellarDashboard = require("./../stellar-dashboard");

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
    let notifyDeadManSwitch = process.argv[2] ? process.argv[2] : false;

    console.log("[MAIN] Fetching known nodes from database");
    let nodesSeed = await NodeRepository.findAllNodes();

    let crawler = new Crawler(true, 2 * 60000); //crawl two minutes on public network

    console.log("[MAIN] Starting Crawler");
    let nodes = await crawler.crawl(nodesSeed);
    nodes = nodes.filter(node => node.publicKey); //filter out nodes without public keys

    console.log("[MAIN] Starting map to stellar dashboard information");
    nodes = await mapStellarDashboardNodes(nodes);

    console.log("[MAIN] Starting geo data fetch");
    nodes = await fetchGeoData(nodes);

    console.log("[MAIN] Archive to S3");
    await archiveToS3(nodes);
    console.log('[MAIN] Archive to S3 completed');


    console.log("[MAIN] Truncating database");
    await NodeRepository.deleteAllNodes();
    console.log("[MAIN] Adding nodes to database" );
    await Promise.all(nodes.map(async node => {
        await NodeRepository.addNode(node);
    }));

    await NodeRepository.destroyConnection();

    let backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
    let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;

    if(!backendApiClearCacheToken || !backendApiClearCacheUrl) {
        throw "Backend cache not configured";
    }

    console.log('[MAIN] clearing api cache');
    await axios.get(backendApiClearCacheUrl + "?token=" + backendApiClearCacheToken);
    console.log('[MAIN] api cache cleared');

    if(notifyDeadManSwitch) {
        console.log('[MAIN] Contacting deadmanswitch');
        let deadManSwitchUrl = process.env.DEADMAN_URL;
        if(!deadManSwitchUrl)
            throw "error: deadmanswitch url not configured";

        await axios.get(deadManSwitchUrl);
    }

    console.log("end of script");
}

async function mapStellarDashboardNodes(nodes) {
    let dashboardNodes = await stellarDashboard.importNodes();

    nodes.forEach((node:Node) => {
        let knownNode = dashboardNodes.find((knownNode) => {
            return node.publicKey === knownNode.publicKey;
        });

        if (knownNode) {
            node.name = knownNode.name;
            node.host = knownNode.host;
        }

    });

    return nodes;
}

async function fetchGeoData(nodes) {

    let nodesToProcess = nodes.filter((node) => {
        "use strict";
        return node.geoData.latitude === undefined;
    });

    await Promise.all(nodesToProcess.map(async (node:Node) => {
        let accessKey = process.env.IPSTACK_ACCESS_KEY;
        if(!accessKey) {
            throw "ERROR: ipstack not configured";
        }

        let url = "http://api.ipstack.com/" + node.ip + '?access_key=' + accessKey;
        let geoDataResponse = await axios.get(url);
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
    }));

    return nodes;
}

async function archiveToS3(nodes) {
    let accessKeyId = process.env.AWS_ACCESS_KEY;
    let secretAccessKey= process.env.AWS_SECRET_ACCESS_KEY;
    let bucketName = process.env.AWS_BUCKET_NAME;
    let environment = process.env.NODE_ENV;
    if(!environment) {
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

    await s3.upload(params).promise();
}

async function postNodesToStellarBeatIO(nodes) {
    console.log("[MAIN] Posting to StellarBeatIO");
    let payload = querystring.stringify({"peers": JSON.stringify(nodes)});
    let url = process.env.FRONTEND_API_URL;

    if(!url)
        throw "Error: frontend not configured";

    await axios.post(url, payload);

}
