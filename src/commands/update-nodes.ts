//@flow
import "reflect-metadata";

require('dotenv').config();
import {HistoryService, HorizonService, TomlService} from "../index";
import {Network, Node, NodeIndex, Organization} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as AWS from 'aws-sdk';
import {Connection} from "typeorm";
import * as Sentry from "@sentry/node";
import Crawl from "../entities/Crawl";
import {CrawlService} from "../services/CrawlService";
import * as validator from "validator";
import {OrganizationService} from "../services/OrganizationService";
import Kernel from "../Kernel";
import {CrawlResultProcessor} from "../services/CrawlResultProcessor";
import CrawlV2 from "../entities/CrawlV2";
import CrawlV2Service from "../services/CrawlV2Service";

Sentry.init({dsn: process.env.SENTRY_DSN});

let isShuttingDown = false;
process
    .on('SIGTERM', shutdown('SIGTERM'))
    .on('SIGINT', shutdown('SIGINT'));
let kernel = new Kernel();
// noinspection JSIgnoredPromiseFromCall
try {
    run();
} catch (e) {
    console.log("MAIN: uncaught error, shutting down: " + e);
    Sentry.captureException(e);
    process.exit(0);
}

async function run() {
    while (true) {
        try {
            console.log("[MAIN] Fetching known nodes from database");
            await kernel.initializeContainer();
            let connection: Connection = kernel.container.get(Connection);
            let crawlService: CrawlService = new CrawlService();
            let crawlV2Service = kernel.container.get(CrawlV2Service);
            let latestCrawl:{nodes: Node[], organizations:Organization[], time:Date};

            console.log("[MAIN] Starting Crawler");
            let nodes: Node[] = [];
            try {

                latestCrawl = await crawlV2Service.getCrawlAt(new Date());
                nodes = await crawlService.crawl(latestCrawl.nodes);
            } catch (e) {
                console.log("[MAIN] Error crawling, breaking off this run: " + e.message);
                Sentry.captureMessage("Error crawling, breaking off this run: " + e.message);
                continue;
            }

            console.log("[MAIN] Updating home domains");
            await updateHomeDomains(nodes);

            console.log("[MAIN] Detecting full validators");
            let tomlService = new TomlService();
            let historyService = new HistoryService();
            await updateNodeFromTomlFiles(nodes, tomlService, historyService);
            await updateFullValidatorStatus(nodes, historyService);
            console.log("[MAIN] Detecting organizations");
            let organizationService = new OrganizationService(crawlService, tomlService);
            let organizations = await organizationService.updateOrganizations(nodes, latestCrawl.organizations);

            console.log("[MAIN] Starting geo data fetch");
            nodes = await fetchGeoData(nodes);

            console.log("[MAIN] Calculating node index");
            let network = new Network(nodes, organizations);
            let nodeIndex = new NodeIndex(network);
            nodes.forEach(node => {
                try {
                    node.index = nodeIndex.getIndex(node)
                } catch (e) {
                    Sentry.captureException(e);
                }
            });

            if (isShuttingDown) { //don't save anything to db to avoid corrupting a crawl
                console.log("shutting down");
                process.exit(0);
            }

            let crawl = new Crawl(new Date(), crawlService.getLatestProcessedLedgers());
            let crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
            let crawlV2 = new CrawlV2(crawl.time, crawl.ledgers);
            await crawlResultProcessor.processCrawl(crawlV2, nodes, organizations);

            await connection.close();

            console.log("[MAIN] Archive to S3");
            await archiveToS3(nodes, crawl.time);
            console.log('[MAIN] Archive to S3 completed');

            let backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
            let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;

            if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
                throw "Backend cache not configured";
            }

            try {
                console.log('[MAIN] clearing api cache');
                await axios.get(
                    backendApiClearCacheUrl + "?token=" + backendApiClearCacheToken,
                    {
                        timeout: 2000,
                        headers: {'User-Agent': 'stellarbeat.io'}
                    }
                );
                console.log('[MAIN] api cache cleared');
            } catch (e) {
                Sentry.captureException(e);
                console.log('[MAIN] Error clearing api cache: ' + e);
            }

            try {
                let deadManSwitchUrl = process.env.DEADMAN_URL;
                if (deadManSwitchUrl) {
                    console.log('[MAIN] Contacting deadmanswitch');
                    await axios.get(deadManSwitchUrl,
                        {
                            timeout: 2000,
                            headers: {'User-Agent': 'stellarbeat.io'}
                        });
                }
            } catch (e) {
                Sentry.captureException(e);
                console.log('[MAIN] Error contacting deadmanswitch: ' + e);
            }


            console.log("end of backend run");
        } catch (e) {
            console.log("MAIN: uncaught error, starting new crawl: " + e);
            let connection = kernel.container.get(Connection);
            if (connection)
                await connection.close();
            Sentry.captureException(e);
        }
    }
}

async function fetchGeoData(nodes: Node[]) {

    let nodesToProcess = nodes.filter((node) => {
        // 0.1% change to update the geo data
        //todo: trigger when ip change
        return node.geoData.longitude === undefined || Math.random() < 0.001;
    });

    await Promise.all(nodesToProcess.map(async (node: Node) => {
        try {
            console.log("[MAIN] Updating geodata for: " + node.displayName);

            let accessKey = process.env.IPSTACK_ACCESS_KEY;
            if (!accessKey) {
                throw new Error("ERROR: ipstack not configured");
            }

            let url = "http://api.ipstack.com/" + node.ip + '?access_key=' + accessKey;
            let geoDataResponse = await axios.get(url,
                {
                    timeout: 2000,
                    headers: {'User-Agent': 'stellarbeat.io'}
                });
            let geoData = geoDataResponse.data;

            if(geoData.error && geoData.success === false)
                throw new Error(geoData.error.type);
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
            node.isp = geoData.connection.isp;
            node.geoData.dateUpdated = new Date();
        } catch (e) {
            console.log("[MAIN] error updating geodata for: " + node.displayName + ": " + e.message);
        }
    }));

    return nodes;
}

async function archiveToS3(nodes: Node[], time: Date): Promise<void> {
    try {
        let accessKeyId = process.env.AWS_ACCESS_KEY;
        let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let bucketName = process.env.AWS_BUCKET_NAME;
        let environment = process.env.NODE_ENV;
        if (!accessKeyId) {
            throw new Error("[MAIN] Not archiving, s3 not configured");
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

        await s3.upload(params as any).promise();
    } catch (e) {
        console.log("[MAIN] error archiving to S3");
    }
}

async function updateHomeDomains(nodes: Node[]) {
    let horizonService = new HorizonService();
    for (let node of nodes.filter(node => node.active && node.isValidator)) {
        try {
            let account: any = await horizonService.fetchAccount(node);
            if (!(account['home_domain'] && validator.isFQDN(account['home_domain'])))
                continue;

            node.homeDomain = account['home_domain'];

            console.log(node.homeDomain);
        } catch (e) {
            console.log("error updating home domain for: " + node.displayName + ": " + e.message);
            //continue to next node
        }
    }
}

async function updateFullValidatorStatus(nodes:Node[], historyService:HistoryService) {
    for (let index in nodes) {
        let node = nodes[index];
        try {
            if (!node.historyUrl){
                node.isFullValidator = false;
                continue;
            }

            console.log("Checking history url: " + node.historyUrl);
            node.isFullValidator = await historyService.stellarHistoryIsUpToDate(node.historyUrl);
            console.log("history up to date?" +  node.isFullValidator);
        } catch (e) {
            console.log("error checking history for: " + node.displayName + ": " + e.message);
        }
    }
}

async function updateNodeFromTomlFiles(nodes: Node[], tomlService: TomlService, historyService: HistoryService) {
    for (let index in nodes) {
        let node = nodes[index];
        try {
            console.log("Fetching toml for " + node.displayName);
            let toml = await tomlService.fetchToml(node);
            if (toml === undefined) {
                console.log(node.displayName + ": no toml file detected");
                continue;
            }

            tomlService.updateNodeFromTomlObject(toml, node);
            if (!node.historyUrl){
                node.isFullValidator = false;
                continue;
            }
        } catch (e) {
            console.log("error updating Toml file for: " + node.displayName + ": " + e.message);
        }
    }
}

function shutdown(signal: string) {
    return () => {
        Sentry.captureMessage("Received signal: " + signal);
        console.log(`${signal}...`);
        isShuttingDown = true;
        setTimeout(() => {
            console.log('...waited 30s, exiting.');
            process.exit(0);
        }, 30000).unref();
    };
}
