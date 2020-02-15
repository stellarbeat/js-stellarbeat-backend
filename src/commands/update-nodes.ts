//@flow
import "reflect-metadata";

require('dotenv').config();
import {HistoryService, HorizonService, TomlService} from "../index";
import {Network, Node, NodeIndex, QuorumSet} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as AWS from 'aws-sdk';
import {Connection, getCustomRepository} from "typeorm";
import * as Sentry from "@sentry/node";
import Crawl from "../entities/Crawl";
import NodeStorage from "../entities/NodeStorage";
import {StatisticsService} from "../services/StatisticsService";
import {NodeMeasurementRepository} from "../repositories/NodeMeasurementRepository";
import {CrawlRepository} from "../repositories/CrawlRepository";
import {CrawlService} from "../services/CrawlService";
import * as validator from "validator";
import OrganizationStorage from "../entities/OrganizationStorage";
import {OrganizationService} from "../services/OrganizationService";
import {NodeMeasurementRollupRepository} from "../repositories/NodeMeasurementRollupRepository";
import {NodeMeasurementDayRepository} from "../repositories/NodeMeasurementDayRepository";
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
            let crawlService: CrawlService = new CrawlService(getCustomRepository(CrawlRepository));
            let crawlV2Service = kernel.container.get(CrawlV2Service);

            console.log("[MAIN] Starting Crawler");
            let nodes: Node[] = [];
            try {

                nodes = await crawlV2Service.getNodes(new Date());
                nodes = await crawlService.crawl(nodes);
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
            let organizations = await organizationService.updateOrganizations(nodes, await crawlV2Service.getOrganizations(new Date()));

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

            console.log("[MAIN] Adding crawl to new postgress database");
            let crawl = new Crawl(new Date(), crawlService.getLatestProcessedLedgers());

            if (isShuttingDown) { //don't save anything to db to avoid corrupting a crawl
                console.log("shutting down");
                process.exit(0);
            }

            await connection.manager.save(crawl); //must be saved first for measurements averages to work

            let statisticsService = new StatisticsService(
                getCustomRepository(NodeMeasurementRepository),
                getCustomRepository(CrawlRepository)
            );
            console.log("[MAIN] Updating Averages");
            try {
                console.time('stats');
                await statisticsService.saveMeasurementsAndUpdateAverages(network, crawl);
                console.timeEnd('stats');
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }

            console.log("[MAIN] filtering out nodes that were 30days inactive"); //todo: archive in beginning?
            nodes = nodes.filter(node =>
                node.statistics.active30DaysPercentage > 0 //could be O because of small fraction
                || node.statistics.active24HoursPercentage > 0
                || node.statistics.activeInLastCrawl
            );

            console.log("[MAIN] Remove quorumsets from validators that were 30days not validating");
            //validators that downgrade to watcher nodes should not have a quorumset and not be recognized as validators
            nodes.filter(node =>
                node.statistics.active30DaysPercentage > 0
                && node.statistics.validating30DaysPercentage === 0
            ).forEach(node => node.quorumSet = new QuorumSet());

            console.log("[MAIN] Adding nodes to database");

            await Promise.all(nodes.map(async node => {
                try {
                    let nodeStorage = new NodeStorage(crawl, node);
                    await connection.manager.save(nodeStorage);
                } catch (e) {
                    console.log(e);
                    Sentry.captureException(e);
                }
            }));

            console.log("[MAIN] Adding organizations to database");

            await Promise.all(organizations.map(async organization => {
                try {
                    let organizationStorage = new OrganizationStorage(crawl, organization);
                    await connection.manager.save(organizationStorage);
                } catch (e) {
                    console.log(e);
                    Sentry.captureException(e);
                }
            }));

            crawl.completed = true;
            await connection.manager.save(crawl);

            console.log("[MAIN] Rollup isvalidating measurements by day");
            try {
                let rollupRepository = getCustomRepository(NodeMeasurementRollupRepository);
                let nodeMeasurementDayRollup = await rollupRepository.findByName("node_measurement_day");
                if (nodeMeasurementDayRollup === undefined)
                    throw new Error("Node measurement day rollup not configured");
                let aggregateFromCrawlId = nodeMeasurementDayRollup.lastAggregatedCrawlId;
                aggregateFromCrawlId++;

                let nodeMeasurementDayRepository = getCustomRepository(NodeMeasurementDayRepository);
                console.log("[MAIN] Update counts from crawlId: " + aggregateFromCrawlId + " to " + crawl.id);
                await nodeMeasurementDayRepository.updateCounts(aggregateFromCrawlId, crawl.id);
                console.log("[MAIN] Update last aggregatedCrawlId");
                nodeMeasurementDayRollup.lastAggregatedCrawlId = crawl.id;
                await connection.manager.save(nodeMeasurementDayRollup);
            } catch (e) {
                console.log(e);
                Sentry.captureException(e);
            }

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
