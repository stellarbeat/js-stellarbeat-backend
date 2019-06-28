//@flow
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
import * as validator from "validator";
import OrganizationStorage from "../entities/OrganizationStorage";
import {OrganizationService} from "../services/OrganizationService";


Sentry.init({dsn: process.env.SENTRY_DSN});

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
    while (true) {
        console.time('backend');
        console.log("[MAIN] Fetching known nodes from database");
        let connection = await createConnection();
        let crawlService = new CrawlService(getCustomRepository(CrawlRepository));
        console.log("[MAIN] Starting Crawler");
        let nodes: Node[] = [];
        try {
            nodes = await crawlService.crawl();
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

        console.log("[MAIN] Detecting organizations");
        let organizationService = new OrganizationService(crawlService, tomlService);
        let organizations = await organizationService.updateOrganizations(nodes);

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

        console.log("[MAIN] filtering out nodes that were 30days inactive");
        nodes = nodes.filter(node =>
            node.statistics.active30DaysPercentage > 0 //could be O because of small fraction
            || node.statistics.active24HoursPercentage > 0
            || node.statistics.activeInLastCrawl
        );

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

async function archiveToS3(nodes: Node[], time: Date) {
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

async function updateNodeFromTomlFiles(nodes: Node[], tomlService: TomlService, historyService:HistoryService) {
    for(let index in nodes){
        let node = nodes[index];
        try {
            console.log("Full validator check for " + node.displayName);
            let toml = await tomlService.fetchToml(node);
            if (toml === undefined) {
                console.log(node.displayName + ": no toml file detected");
                continue;
            }

            /*let name = tomlService.getNodeName(node.publicKey, toml);
            if (name !== undefined) {
                node.name = name;
            }*/
            tomlService.updateNodeFromTomlObject(toml, node);

            let historyUrls = tomlService.getHistoryUrls(toml, node.publicKey);
            console.log(historyUrls);
            let historyIsUpToDate = false;
            let counter = 0;
            while (!historyIsUpToDate && counter < historyUrls.length) {
                console.log("Checking history url: " + historyUrls[counter]);
                historyIsUpToDate = await historyService.stellarHistoryIsUpToDate(historyUrls[counter]);
                counter++;
                console.log("history up to date?" + historyIsUpToDate);
            }
            if (historyIsUpToDate) {
                console.log("Full validator found!! node: " + node.displayName);
                /*if (!node.isFullValidator)
                    Sentry.captureMessage("Full validator found!! Publickey: " + node.publicKey);*/

                node.isFullValidator = true;
            } else {
                if(node.isFullValidator) {
                    console.log("regression: node no longer full validator");
                }
                node.isFullValidator = false;
            }

        } catch (e) {
            console.log("error updating full validator status for: " + node.displayName + ": " + e.message);
        }
    }
}