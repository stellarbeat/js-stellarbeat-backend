//@flow
import "reflect-metadata";

require('dotenv').config();
import {HistoryService, HorizonService, TomlService} from "../index";
import {Node, NodeIndex, Network} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as AWS from 'aws-sdk';
import * as Sentry from "@sentry/node";
import {CrawlerService} from "../services/CrawlerService";
import validator from "validator";
import Kernel from "../Kernel";
import {CrawlResultProcessor} from "../services/CrawlResultProcessor";
import CrawlV2 from "../entities/CrawlV2";

if (process.env.NODE_ENV === 'production') {
    Sentry.init({dsn: process.env.SENTRY_DSN});
}

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
    await kernel.initializeContainer();
    let crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
    let crawlService = kernel.container.get(CrawlerService);
    let networkId = process.env.NETWORK;
    let topTierFallbackConfig = process.env.TOP_TIER_FALLBACK;
    let topTierFallbackNodes = typeof topTierFallbackConfig === "string" ? topTierFallbackConfig.split(" ") : [];

    if (networkId === 'test')
        crawlService.usePublicNetwork = false;

    while (true) {
        try {
            console.log("[MAIN] Crawl");
            let crawlResult = await crawlService.crawl(topTierFallbackNodes);

            if (crawlResult.isErr()) {
                console.log("[MAIN] Error crawling, breaking off this run: " + crawlResult.error.message);
                Sentry.captureException(crawlResult.error);
                continue;
            }

            let nodes = crawlResult.value.nodes;
            console.log("[MAIN] Updating home domains");
            await updateHomeDomains(nodes);

            let tomlService = new TomlService();
            let historyService = new HistoryService();

            console.log("[MAIN] Processing node TOML Files");
            let tomlObjects = await tomlService.fetchTomlObjects(nodes);

            console.log("[MAIN] Processing organizations & nodes from TOML");
            let organizations = tomlService.processTomlObjects(tomlObjects, crawlResult.value.organizations, nodes);

            console.log("[MAIN] Detecting full validators");
            await updateFullValidatorStatus(nodes, historyService);

            console.log("[MAIN] Starting geo data fetch");
            await fetchGeoData(crawlResult.value.nodesWithNewIP);

            console.log("[MAIN] Calculating node index");//move to statistics processing
            let nodeIndex = new NodeIndex(new Network(nodes));
            nodes.forEach(node => node.index = nodeIndex.getIndex(node));

            if (isShuttingDown) { //don't save anything to db to avoid corrupting a crawl
                console.log("shutting down");
                process.exit(0);
            }

            let crawlV2 = new CrawlV2(new Date(), crawlResult.value.processedLedgers);
            crawlV2.latestLedger = crawlResult.value.latestClosedLedger.sequence;
            crawlV2.latestLedgerCloseTime = crawlResult.value.latestClosedLedger.closeTime;

            const processCrawlResult = await crawlResultProcessor.processCrawl(crawlV2, nodes, organizations);
            if (processCrawlResult.isErr())//@ts-ignore
                throw processCrawlResult.error;

            console.log("[MAIN] Archive to S3");
            await archiveToS3(nodes, crawlV2.time);
            console.log('[MAIN] Archive to S3 completed');

            let backendApiClearCacheUrl = process.env.BACKEND_API_CACHE_URL;
            let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;

            if (!backendApiClearCacheToken || !backendApiClearCacheUrl) {
                throw "Backend cache not configured";
            }

            try {
                console.log('[MAIN] clearing api cache');
                let source = axios.CancelToken.source();
                setTimeout(() => {
                    source.cancel('Connection time-out');
                    // Timeout Logic
                }, 2050);
                await axios.get(
                    backendApiClearCacheUrl + "?token=" + backendApiClearCacheToken,
                    {
                        cancelToken: source.token,
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
                    let source = axios.CancelToken.source();
                    setTimeout(() => {
                        source.cancel('Connection time-out');
                        // Timeout Logic
                    }, 2050);
                    await axios.get(deadManSwitchUrl!,
                        {
                            cancelToken: source.token,
                            timeout: 2000,
                            headers: {'User-Agent': 'stellarbeat.io'}
                        });
                }
            } catch (e) {
                Sentry.captureException(e);
                console.log('[MAIN] Error contacting deadmanswitch: ' + e);
            }

            if (!process.env.LOOP) {
                console.log("Shutting down crawler");
                break;
            }
            console.log("end of backend run");
        } catch (e) {
            console.log("MAIN: uncaught error, starting new crawl: " + e);
            Sentry.captureException(e);
        }
    }
}

async function fetchGeoData(nodes: Node[]) {
    console.log('[MAIN]: Fetching geo data of ' + nodes.length + ' nodes');

    await Promise.all(nodes.map(async (node: Node) => {
        try {
            console.log("[MAIN] Updating geodata for: " + node.displayName);

            let accessKey = process.env.IPSTACK_ACCESS_KEY;
            if (!accessKey) {
                throw new Error("ERROR: ipstack not configured");
            }

            let url = "https://api.ipstack.com/" + node.ip + '?access_key=' + accessKey;
            let source = axios.CancelToken.source();
            setTimeout(() => {
                source.cancel('Connection time-out');
                // Timeout Logic
            }, 2050);
            let geoDataResponse = await axios.get(url,
                {
                    cancelToken: source.token,
                    timeout: 2000,
                    headers: {'User-Agent': 'stellarbeat.io'}
                });
            let geoData = geoDataResponse.data;

            if (geoData.error && geoData.success === false)
                throw new Error(geoData.error.type);

            if (geoData.longitude === null || geoData.latitude === null)
                throw new Error("Longitude or latitude has null value");

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
        } catch (e) {
            let errorMessage = "[MAIN] error updating geodata for: " + node.displayName;
            if (e instanceof Error) {
                errorMessage = errorMessage + ": " + e.message;
            }
            console.log(errorMessage);
        }
    }));
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

        } catch (e) {
            console.log("Info: Failed updating home domain for: " + node.displayName + (e instanceof Error ? ": " + e.message : ""));
            //continue to next node
        }
    }
}

async function updateFullValidatorStatus(nodes: Node[], historyService: HistoryService) {
    for (let index in nodes) {
        let node = nodes[index];
        try {
            if (!node.historyUrl) {
                node.isFullValidator = false;
                continue;
            }
            node.isFullValidator = await historyService.stellarHistoryIsUpToDate(node.historyUrl);
        } catch (e) {
            console.log("Info: failed checking history for: " + node.displayName + (e instanceof Error ? ": " + e.message : ""));
        }
    }
}

function shutdown(signal: string) {
    return () => {
        console.log(`${signal}...`);
        isShuttingDown = true;
        setTimeout(() => {
            console.log('...waited 30s, exiting.');
            process.exit(0);
        }, 30000).unref();
    };
}
