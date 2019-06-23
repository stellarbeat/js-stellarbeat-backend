//@flow
import {CrawlService} from "./services/CrawlService";

require('dotenv').config();

import * as swaggerUiExpress from 'swagger-ui-express';
import * as express from 'express';
import {createConnection, getCustomRepository} from "typeorm";
import {CrawlRepository} from "./repositories/CrawlRepository";

const swaggerDocument = require('../swagger/swagger.json');
const api = express();

const listen = async () => {
    await createConnection();
    let crawlService = new CrawlService(getCustomRepository(CrawlRepository));
    let nodes = await crawlService.getNodesFromLatestCrawl();
    let organizations = await crawlService.getOrganizationsFromLatestCrawl();
    let port = process.env.PORT || 3000;
    let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
    if(!backendApiClearCacheToken)
        throw "Error: api token not configured";

    api.use(function (req: express.Request, res: express.Response, next: express.NextFunction) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

   api.use(function (req, res, next) {
        if (req.url.match(/^\/$/)
        ) {
            res.redirect(301,'/docs');
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
    api.get('/v1/all', (req: express.Request, res: express.Response) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send({
            "nodes": nodes,
            "organizations": organizations
        });
    });
    api.get('/v1/clear-cache', async (req: express.Request, res: express.Response) => {
        if(req.param("token") !== backendApiClearCacheToken){
            res.send("invalid token");
            return;
        }

        nodes = await crawlService.getNodesFromLatestCrawl();
        organizations = await crawlService.getOrganizationsFromLatestCrawl();
        res.send("cache cleared!");
    });

    api.listen(port, () => console.log('api listening on port: ' + port));
};

listen();