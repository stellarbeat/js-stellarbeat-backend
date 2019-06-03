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
    let connection = await createConnection();
    let crawlService = new CrawlService(getCustomRepository(CrawlRepository));
    let nodes = await crawlService.getNodesFromLatestCrawl();
    connection.close();
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
        res.send(nodes)
    });
    api.get('/v1/clear-cache', async (req: express.Request, res: express.Response) => {
        if(req.param("token") !== backendApiClearCacheToken){
            res.send("invalid token");
            return;
        }

        connection = await createConnection();
        nodes = await crawlService.getNodesFromLatestCrawl();
        await connection.close();
        res.send("cache cleared!");
    });

    api.listen(port, () => console.log('api listening on port: ' + port));
};

listen();