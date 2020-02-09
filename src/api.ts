require('dotenv').config();

import * as swaggerUiExpress from 'swagger-ui-express';
import * as express from 'express';
import {getCustomRepository} from "typeorm";
import {NodeMeasurementDayRepository} from "./repositories/NodeMeasurementDayRepository";
import CrawlV2Service from "./services/CrawlV2Service";

import Kernel from "./Kernel";
import {isDateString} from "./validation/isDateString";
import NodeMeasurementService from "./services/NodeMeasurementService";

const swaggerDocument = require('../swagger/swagger.json');
const api = express();

const listen = async () => {
    let kernel = new Kernel();
    await kernel.initializeContainer();
    let crawlV2Service = kernel.container.get(CrawlV2Service);
    let nodeMeasurementService = kernel.container.get(NodeMeasurementService);
    let nodeMeasurementDayRepository = getCustomRepository(NodeMeasurementDayRepository);
    let result = await crawlV2Service.getCrawlAt(new Date());
    let nodes = result.nodes;
    let organizations = result.organizations;
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
        res.send(nodes);
    });
    api.get('/v1/nodes/:publicKey', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(nodes.find(node => node.publicKey === req.params.publicKey));
    });
    api.get('/v1/organizations', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(organizations)
    });
    api.get('/v1/organizations/:id', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(organizations.find(organization => organization.id === req.params.id));
    });
    api.get('/v1/validating-statistics/:publicKey', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        let to = req.query.to;
        if (to !== null && to !== undefined) {
            to = new Date(to);
        } else {
            to = new Date();
            to.setDate(to.getDate() - 1); //yesterday is a fully aggregated day
        }
        let from = req.query.from;
        if (from !== null && from !== undefined) {
            from = new Date(from);
        } else {
            from = new Date();
            from.setDate(to.getDate() - 30) //return 30 day stats by default
        }
        let stats = await nodeMeasurementDayRepository.findBetween(req.params.publicKey, from, to);
        res.send(stats);
    });

    api.get('/v2/node-statistics/:publicKey', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await crawlV2Service.getNodeDayStatistics(req.params.publicKey, new Date(from), new Date(to));
        res.send(stats);
    });

    api.get('/v2/node-day-measurements/:publicKey', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await crawlV2Service.getNodeDayStatistics(req.params.publicKey, new Date(from), new Date(to));
        res.send(stats);
    });

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

    api.get('/v2/organization-day-measurements/:organizationId', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await crawlV2Service.getOrganizationDayStatistics(req.params.organizationId, new Date(from), new Date(to));
        res.send(stats);
    });

    api.get('/v2/organization-measurements/:organizationId', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await nodeMeasurementService.getNodeMeasurements(req.params.organizationId, new Date(from), new Date(to));
        res.send(stats);
    });

    /*
    @deprecated
     */
    api.get('/v2/organization-statistics/:organizationId', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

        let to = req.query.to;
        let from = req.query.from;

        if(!isDateString(to) || !isDateString(from)){
            res.status(400);
            res.send("invalid to or from parameters")
        }

        let stats = await crawlV2Service.getOrganizationDayStatistics(req.params.organizationId, new Date(from), new Date(to));
        res.send(stats);
    });

    api.get('/v1/all', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send({
            "nodes": nodes,
            "organizations": organizations
        });
    });
    api.get('/v2/all', async (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds
        let at = req.query.at;
        let time: Date;
        if (at && isDateString(at))
            time = new Date(at);
        else
            time = new Date();
        res.send(await crawlV2Service.getCrawlAt(time));
    });
    api.get('/v1/clear-cache', async (req: express.Request, res: express.Response) => {
        if (req.param("token") !== backendApiClearCacheToken) {
            res.send("invalid token");
            return;
        }

        result = await crawlV2Service.getCrawlAt(new Date());
        nodes = result.nodes;
        organizations = result.organizations;

        res.send("cache cleared!");
    });

    api.listen(port, () => console.log('api listening on port: ' + port));
};

listen();