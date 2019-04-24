"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
//@flow
require('dotenv').config();
const swaggerUiExpress = require("swagger-ui-express");
const express = require("express");
const node_repository_1 = require("./node-repository");
const swaggerDocument = require('../swagger/swagger.json');
const api = express();
const nodeRepository = new node_repository_1.NodeRepository();
const listen = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
    let nodes = yield nodeRepository.findAllNodes();
    let port = process.env.PORT || 3000;
    let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
    if (!backendApiClearCacheToken)
        throw "Error: api token not configured";
    api.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    api.use(function (req, res, next) {
        if (req.url.match(/^\/$/)) {
            res.redirect(301, '/docs');
        }
        next();
    });
    api.use('/docs', swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerDocument));
    api.get('/v1/nodes', (req, res) => {
        res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
        res.send(nodes);
    });
    api.get('/v1/clear-cache', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (req.param("token") !== backendApiClearCacheToken) {
            res.send("invalid token");
            return;
        }
        nodes = yield nodeRepository.findAllNodes();
        res.send("cache cleared!");
    }));
    api.listen(port, () => console.log('api listening on port: ' + port));
});
listen();
//# sourceMappingURL=api.js.map