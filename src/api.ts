import OrganizationMeasurementService from "./services/OrganizationMeasurementService";

require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger/openapi.json');

import * as express from 'express';
import CrawlV2Service from "./services/CrawlV2Service";
import * as Sentry from "@sentry/node";
import Kernel from "./Kernel";
import {isDateString} from "./validation/isDateString";
import NodeMeasurementService from "./services/NodeMeasurementService";
import NodeSnapShotter from "./services/SnapShotting/NodeSnapShotter";
import {Network} from "@stellarbeat/js-stellar-domain";
import OrganizationSnapShotter from "./services/SnapShotting/OrganizationSnapShotter";
import {NetworkMeasurementMonthRepository} from "./repositories/NetworkMeasurementMonthRepository";
import {NetworkMeasurementDayRepository} from "./repositories/NetworkMeasurementDayRepository";
import {NetworkMeasurementRepository} from "./repositories/NetworkMeasurementRepository";
import {Between} from "typeorm";

const api = express();

if (process.env.NODE_ENV === 'production') {
    Sentry.init({dsn: process.env.SENTRY_DSN});
}

const getDateFromParam = (param: string) => {
    let time: Date;
    if (!(param && isDateString(param))) {
        time = new Date();
    } else {
        time = new Date(param);
    }

    return time;
}

const listen = async () => {
    let kernel = new Kernel();
    await kernel.initializeContainer();
    let crawlV2Service = kernel.container.get(CrawlV2Service);
    let nodeMeasurementService = kernel.container.get(NodeMeasurementService);
    let organizationMeasurementService = kernel.container.get(OrganizationMeasurementService);
    let nodeSnapShotter = kernel.container.get(NodeSnapShotter);
    let organizationSnapShotter = kernel.container.get(OrganizationSnapShotter);
    let latestNetworkInCache: Network | undefined;
    const getNetwork = async (at?: string | undefined): Promise<Network | undefined> => {
        if ((at && isDateString(at))) {
            let atTime = new Date(at);
            let crawl = await crawlV2Service.getCrawlAt(atTime);
            if (crawl) {
                return new Network(crawl.nodes, crawl.organizations, crawl.time, crawl.statistics);
            }
        }

        if (!latestNetworkInCache) {
            let latestCrawl = await crawlV2Service.getCrawlAt(new Date());
            if (latestCrawl) {
                latestNetworkInCache = new Network(latestCrawl.nodes, latestCrawl.organizations, latestCrawl.time, latestCrawl.statistics);
            }
        }

        return latestNetworkInCache;
    }

    let port = process.env.PORT || 3000;
    let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
    if (!backendApiClearCacheToken)
        throw "Error: api token not configured";

    let swaggerOptions = {
        customCss: '.swagger-ui .topbar { display: none }',
        explorer: true,
        customSiteTitle: "Stellarbeat API doc"
    };
    api.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

    api.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    api.use(function (req, res, next) {
        if (req.url.match(/^\/$/)
        ) {
            res.redirect(301, '/v1');
        }
        next();
    });

    api.get(['/v1/network/stellar-public/node', '/v1/node', '/v1/nodes'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        let network = await getNetwork(req.query.at);
        if (network)
            res.send(network.nodes);
        else res.status(500).send('Internal Server Error: no crawl data');
    });

    api.get(['/v1/network/stellar-public/node/:publicKey', '/v1/node/:publicKey', '/v1/nodes/:publicKey'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        let network = await getNetwork(req.query.at);
        if (network) {
            let node = network.getNodeByPublicKey(req.params.publicKey);
            if (node.unknown)
                res.send(404);
            else
                res.send(node);
        } else res.status(500).send('Internal Server Error: no crawl data');
    });

    api.get(['/v1/network/stellar-public/node/:publicKey/snapshots', '/v1/node/:publicKey/snapshots'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await nodeSnapShotter.findLatestSnapShotsByNode(req.params.publicKey, getDateFromParam(req.query.at)));
    });

    api.get(['/v1/network/stellar-public/node/:publicKey/day-statistics', '/v1/node/:publicKey/day-statistics'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await nodeMeasurementService.getNodeDayMeasurements(req.params.publicKey, getDateFromParam(req.query.from), getDateFromParam(req.query.to)));
    });

    api.get(['/v1/network/stellar-public/node/:publicKey/statistics', '/v1/node/:publicKey/statistics'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await nodeMeasurementService.getNodeMeasurements(req.params.publicKey, getDateFromParam(req.query.from), getDateFromParam(req.query.to)));
    });

    api.get(['/v1/network/stellar-public/organization', '/v1/organization', '/v1/organizations'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        let network = await getNetwork(req.query.at);
        if (network)
            res.send(network.organizations)
        else res.status(500).send('Internal Server Error: no crawl data');
    });
    api.get(['/v1/network/stellar-public/organization/:id', '/v1/organization/:id', '/v1/organizations/:id'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        let network = await getNetwork(req.query.at);
        if (network)
            res.send(network.organizations.find(organization => organization.id === req.params.id));
        else res.status(500).send('Internal Server Error: no crawl data');
    });

    api.get(['/v1/network/stellar-public/organization/:id/snapshots', '/v1/organization/:id/snapshots'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await organizationSnapShotter.findLatestSnapShotsByOrganization(req.params.id, getDateFromParam(req.query.at)));
    });

    api.get(['/v1/network/stellar-public/organization/:id/day-statistics', '/v1/organization/:id/day-statistics'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await organizationMeasurementService.getOrganizationDayMeasurements(req.params.id, getDateFromParam(req.query.from), getDateFromParam(req.query.to)));
    });

    api.get(['/v1/network/stellar-public/organization/:id/statistics', '/v1/organization/:id/statistics'],
        async (req: express.Request, res: express.Response) => {
            res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
            res.send(await organizationMeasurementService.getOrganizationMeasurements(req.params.id, getDateFromParam(req.query.from), getDateFromParam(req.query.to)));
        });

    api.get(['/v1/network/stellar-public', '/v1', '/v2/all'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds

        let network = await getNetwork(req.query.at);
        if (!network)
            res.status(500).send('Internal Server Error: no crawl data');
        else
            res.send(network);
    });

    api.get(['/v1/network/stellar-public/month-statistics', '/v1/month-statistics'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if (!isDateString(to) || !isDateString(from)) {
            res.status(400);
            res.send("invalid to or from parameters")
            return;
        }

        let stats = await kernel.container.get(NetworkMeasurementMonthRepository).findBetween(new Date(from), new Date(to));
        res.send(stats);
    });

    api.get(['/v1/network/stellar-public/day-statistics', '/v1/day-statistics'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await kernel.container.get(NetworkMeasurementDayRepository).findBetween(getDateFromParam(req.query.from), getDateFromParam(req.query.to)));
    });

    api.get(['/v1/network/stellar-public/statistics', '/v1/statistics'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let stats = await kernel.container.get(NetworkMeasurementRepository).find({
            where: [{
                time: Between(getDateFromParam(req.query.from), getDateFromParam(req.query.to))
            }]
        })

        res.send(stats);
    });

    api.get(['/v1/network/stellar-public/node-snapshots', '/v1/node-snapshots'], async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await nodeSnapShotter.findLatestSnapShots(getDateFromParam(req.query.at)));
    });

    api.get(['/v1/network/stellar-public/organization-snapshots', '/v1/organization-snapshots'],
        async (req: express.Request, res: express.Response) => {
            res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
            res.send(await organizationSnapShotter.findLatestSnapShots(getDateFromParam(req.query.at)));
        });

    api.get('/v1/clear-cache', async (req: express.Request, res: express.Response) => {
        if (req.param("token") !== backendApiClearCacheToken) {
            res.send("invalid token");
            return;
        }

        latestNetworkInCache = undefined;
        res.send("cache cleared!");
    });

    api.listen(port, () => console.log('api listening on port: ' + port));
};

listen();