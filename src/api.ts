import OrganizationMeasurementService from "./services/OrganizationMeasurementService";

require('dotenv').config();

import * as swaggerUiExpress from 'swagger-ui-express';
import * as express from 'express';
import CrawlV2Service from "./services/CrawlV2Service";

import Kernel from "./Kernel";
import {isDateString} from "./validation/isDateString";
import NodeMeasurementService from "./services/NodeMeasurementService";
import NodeSnapShotter from "./services/SnapShotting/NodeSnapShotter";
import {Network} from "@stellarbeat/js-stellar-domain";
import OrganizationSnapShotter from "./services/SnapShotting/OrganizationSnapShotter";

const swaggerDocument = require('../swagger/swagger.json');
const api = express();

const listen = async () => {
    let kernel = new Kernel();
    await kernel.initializeContainer();
    let crawlV2Service = kernel.container.get(CrawlV2Service);
    let nodeMeasurementService = kernel.container.get(NodeMeasurementService);
    let organizationMeasurementService = kernel.container.get(OrganizationMeasurementService);
    let nodeSnapShotter = kernel.container.get(NodeSnapShotter);
    let organizationSnapShotter = kernel.container.get(OrganizationSnapShotter);
    let latestCrawl = await crawlV2Service.getCrawlAt(new Date());
    let latestNetwork = new Network(latestCrawl.nodes, latestCrawl.organizations, latestCrawl.time);
    let port = process.env.PORT || 3000;
    let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
    if (!backendApiClearCacheToken)
        throw "Error: api token not configured";

    api.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    api.use(function (req, res, next) {
        if (req.url.match(/^\/$/)
        ) {
            res.redirect(301, '/docs');
        }
        next();
    });

    api.use('/docs', swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerDocument));

    api.get('/v1/nodes', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(latestNetwork.nodes);
    });

    api.get('/v1/nodes/:publicKey', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(latestNetwork.nodes.find(node => node.publicKey === req.params.publicKey));
    });

    api.get('/v1/nodes/:publicKey/snapshots', async (req: express.Request, res: express.Response) => {
        let at = req.query.at;
        let time: Date;
        if (!(at && isDateString(at))){
            time = new Date();
        } else {
            time = new Date(at);
        }
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await nodeSnapShotter.findLatestSnapShots(req.params.publicKey, time));
    });

    api.get('/v1/nodes/:publicKey/day-measurements', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await nodeMeasurementService.getNodeDayMeasurements(req.params.publicKey, new Date(from), new Date(to));
        res.send(stats);
    });
    api.get('/v1/nodes/:publicKey/measurements', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await nodeMeasurementService.getNodeMeasurements(req.params.publicKey, new Date(from), new Date(to));
        res.send(stats);
    });

    api.get('/v1/organizations', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(latestNetwork.organizations)
    });
    api.get('/v1/organizations/:id', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(latestNetwork.organizations.find(organization => organization.id === req.params.id));
    });

    api.get('/v1/organizations/:id/snapshots', async (req: express.Request, res: express.Response) => {
        let at = req.query.at;
        let time: Date;
        if (!(at && isDateString(at))){
            time = new Date();
        } else {
            time = new Date(at);
        }
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(await organizationSnapShotter.findLatestSnapShots(req.params.id, time));
    });

    api.get('/v1/organizations/:id/day-measurements', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await organizationMeasurementService.getOrganizationDayMeasurements(req.params.id, new Date(from), new Date(to));
        res.send(stats);
    });

    api.get('/v1/organizations/:id/measurements', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await organizationMeasurementService.getOrganizationMeasurements(req.params.id, new Date(from), new Date(to));
        res.send(stats);
    });

    /*
     * @deprecated use /v1/nodes/:publicKey/day-measurements
     */
    api.get('/v2/node-day-measurements/:publicKey', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await nodeMeasurementService.getNodeDayMeasurements(req.params.publicKey, new Date(from), new Date(to));
        res.send(stats);
    });

    /**
     * @deprecated use /v1/nodes/:publicKey/measurements
     */
    api.get('/v2/node-measurements/:publicKey', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await nodeMeasurementService.getNodeMeasurements(req.params.publicKey, new Date(from), new Date(to));
        res.send(stats);
    });

    /**
     * @deprecated use v1/organization/:id/day-measurements
     */
    api.get('/v2/organization-day-measurements/:organizationId', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await organizationMeasurementService.getOrganizationDayMeasurements(req.params.organizationId, new Date(from), new Date(to));
        res.send(stats);
    });

    /**
     * @deprecated use v1/organization/:id/measurements
     */
    api.get('/v2/organization-measurements/:organizationId', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await organizationMeasurementService.getOrganizationMeasurements(req.params.organizationId, new Date(from), new Date(to));
        res.send(stats);
    });

    api.get('/v2/all', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds
        let at = req.query.at;
        let time: Date;
        if (!(at && isDateString(at))){
            res.send(latestCrawl);
            return;
        }

        time = new Date(at);
        res.send(await crawlV2Service.getCrawlAt(time));
    });

    api.get('/v1/networks/stellar-public', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds
        let at = req.query.at;
        let time: Date;
        if (!(at && isDateString(at))){
            res.send({
                time: latestNetwork.crawlDate,
                transitiveQuorumSet: Array.from(latestNetwork.graph.networkTransitiveQuorumSet),
                scp: latestNetwork.graph.stronglyConnectedComponents
                    .filter(scp => scp.size > 1)
                    .map(scp => Array.from(scp)),
            });
            return;
        }

        time = new Date(at);
        let crawl = await crawlV2Service.getCrawlAt(time);
        let network = new Network(crawl.nodes, crawl.organizations, crawl.time);
        res.send({
            time: network.crawlDate,
            transitiveQuorumSet: Array.from(network.graph.networkTransitiveQuorumSet),
            scp: network.graph.stronglyConnectedComponents
                .filter(scp => scp.size > 1)
                .map(scp => Array.from(scp)),
        });
    });

    api.get('/v1/clear-cache', async (req: express.Request, res: express.Response) => {
        if (req.param("token") !== backendApiClearCacheToken) {
            res.send("invalid token");
            return;
        }

        latestCrawl = await crawlV2Service.getCrawlAt(new Date());
        res.send("cache cleared!");
    });

    api.listen(port, () => console.log('api listening on port: ' + port));
};

listen();