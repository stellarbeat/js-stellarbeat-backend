//@flow
import {HorizonError} from "../errors/horizon-error";
import "reflect-metadata";

require('dotenv').config();
import {HistoryService, HorizonService, TomlService} from "../index";
import {Network, Node, NodeIndex} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as AWS from 'aws-sdk';
import {createConnection, getCustomRepository} from "typeorm";
import * as Sentry from "@sentry/node";
import Crawl from "../entities/Crawl";
import NodeStorage from "../entities/NodeStorage";
import {StatisticsService} from "../services/StatisticsService";
import {NodeMeasurementRepository} from "../repositories/NodeMeasurementRepository";
import {CrawlRepository} from "../repositories/CrawlRepository";
import {CrawlService} from "../services/CrawlService";

Sentry.init({dsn: process.env.SENTRY_DSN});

const stellarDashboard = require("./../stellar-dashboard");

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
    while (true) {
        console.time('backend');
        console.log("[MAIN] Fetching known nodes from database");
        let connection = await createConnection();
        let crawlService = new CrawlService(getCustomRepository(CrawlRepository));
        console.log("[MAIN] Starting Crawler");
        let nodes:Node[] = [];
        try {
            nodes = await crawlService.crawl();
        } catch (e) {
            console.log("[MAIN] Error crawling, breaking off this run: " + e.message);
            Sentry.captureMessage("Error crawling, breaking off this run: " + e.message);
            continue;
        }

        console.log("[MAIN] Fetch toml files");
        nodes = await processTomlFiles(nodes);

        console.log("[MAIN] Starting map to stellar dashboard information");
        nodes = await mapStellarDashboardNodes(nodes);

        console.log("[MAIN] Starting geo data fetch");
        nodes = await fetchGeoData(nodes);

        console.log("[MAIN] Calculating node index");
        let network = new Network(nodes);
        let nodeIndex = new NodeIndex(network);
        nodes.forEach(node => {
            try {
                node.index = nodeIndex.getIndex(node)
            } catch (e) {
                Sentry.captureException(e);
            }

        });
        console.log("[MAIN] statistics"); //todo group in transaction
        let statisticsService = new StatisticsService(
            getCustomRepository(NodeMeasurementRepository),
            getCustomRepository(CrawlRepository)
        );
        console.log("[MAIN] Adding crawl to new postgress database");
        let crawl = new Crawl(new Date(), crawlService.getLatestProcessedLedgers());

        await connection.manager.save(crawl); //must be saved first for measurements averages to work

        console.log("[MAIN] Updating Averages");
        try {
            await statisticsService.saveMeasurementsAndUpdateAverages(network, crawl);
        } catch (e) {
            console.log(e);
            Sentry.captureException(e);
        }


        console.log("[MAIN] Adding nodes to new postgress database");

        await Promise.all(nodes.map(async node => {
            try {
                let nodeStorage = new NodeStorage(crawl, node);
                await connection.manager.save(nodeStorage);
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }
        }));
        await connection.close();

        console.log("[MAIN] Archive to S3");
        await archiveToS3(nodes, crawl.time);
        console.log('[MAIN] Archive to S3 completed');

        let backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
        let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;

        if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
            throw "Backend cache not configured";
        }

        console.log('[MAIN] clearing api cache');
        await axios.get(backendApiClearCacheUrl + "?token=" + backendApiClearCacheToken);
        console.log('[MAIN] api cache cleared');

        let deadManSwitchUrl = process.env.DEADMAN_URL;
        if (deadManSwitchUrl) {
            console.log('[MAIN] Contacting deadmanswitch');
            await axios.get(deadManSwitchUrl);
        }

        console.timeEnd('backend');
        console.log("end of backend run");
    }
}

async function mapStellarDashboardNodes(nodes: Node[]) {
    let dashboardNodes = await stellarDashboard.importNodes();

    nodes.forEach((node: Node) => {
        let knownNode = dashboardNodes.find((knownNode: Node) => {
            return node.publicKey === knownNode.publicKey;
        });

        if (knownNode) {
            node.name = knownNode.name;
            node.host = knownNode.host;
        }

    });

    return nodes;
}

async function fetchGeoData(nodes: Node[]) {

    let nodesToProcess = nodes.filter((node) => {
        "use strict";
        return node.geoData.latitude === undefined;
    });

    await Promise.all(nodesToProcess.map(async (node: Node) => {
        let accessKey = process.env.IPSTACK_ACCESS_KEY;
        if (!accessKey) {
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

async function archiveToS3(nodes: Node[], time:Date) {
    let accessKeyId = process.env.AWS_ACCESS_KEY;
    let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let bucketName = process.env.AWS_BUCKET_NAME;
    let environment = process.env.NODE_ENV;
    if (!accessKeyId) {
        return "Not archiving, s3 not configured";
    }

    let params = {
        Bucket: bucketName,
        Key: environment + "/"
            + time.getFullYear()
            + "/" + time.toLocaleString("en-us", {month: "short"})
            + "/" + time.toISOString()
            + ".json",
        Body: JSON.stringify(nodes)
    };

    let s3 = new AWS.S3({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    });

    return await s3.upload(params as any).promise();
}

async function processTomlFiles(nodes: Node[]) {
    let tomlService = new TomlService();
    let horizonService = new HorizonService();
    //todo: horizon requests time out when all fired at once
    for (let node of nodes.filter(node => node.active && node.isValidator)) {
        try {
            let account: any = await horizonService.fetchAccount(node);

            let domain = account['home_domain'];

            if (domain === undefined) {
                continue;
            }

            node.homeDomain = domain;
            console.log(node.homeDomain);

            let toml = await tomlService.fetchToml(node);

            if (toml === undefined) {
                continue;
            }

            let name = tomlService.getNodeName(node.publicKey, toml);
            if (name !== undefined) {
                node.name = name;
            }
            let historyUrls = tomlService.getHistoryUrls(toml);
            console.log(historyUrls);
            let historyIsUpToDate = false;
            let counter = 0;
            let historyService = new HistoryService();
            while (!historyIsUpToDate && counter < historyUrls.length) {
                historyIsUpToDate = await historyService.stellarHistoryIsUpToDate(historyUrls[counter]);
                counter++;
                console.log("history up to date?" + historyIsUpToDate);
            }
            if (historyIsUpToDate) {
                console.log("Full validator found!! Publickey: " + node.publicKey);
                if (!node.isFullValidator)
                    Sentry.captureMessage("Full validator found!! Publickey: " + node.publicKey);

                node.isFullValidator = true;
            } else {
                node.isFullValidator = false;
            }
        } catch (e) {
            if (e instanceof HorizonError) {
                //console.log(e.message);
                //isFullValidator status is not changed
                //log
            } else if (e instanceof Error) {
                Sentry.captureException(e);
            } else {
                throw e;
            }
        }
    }

    return nodes;

}