"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//@flow
require('dotenv').config();
const swaggerUiExpress = require("swagger-ui-express");
const express = require("express");
const node_repository_1 = require("./node-repository");
const swaggerDocument = require('../swagger/swagger.json');
const api = express();
const listen = () => __awaiter(this, void 0, void 0, function* () {
    let nodes = yield node_repository_1.default.findAllNodes();
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
    api.get('/v1/clear-cache', (req, res) => __awaiter(this, void 0, void 0, function* () {
        if (req.param("token") !== backendApiClearCacheToken) {
            res.send("invalid token");
            return;
        }
        nodes = yield node_repository_1.default.findAllNodes();
        res.send("cache cleared!");
    }));
    api.listen(port, () => console.log('api listening on port: ' + port));
});
listen();
//# sourceMappingURL=index.js.map