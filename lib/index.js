//
require('dotenv').config();


const express = require('express');
const api = express();
const compression = require('compression');
const nodeRepository = require("./node-repository");

const listen = async () => {
    let nodes = await nodeRepository.findAllNodes();
    let port = process.env.PORT || 3000;
    api.use(compression());
    let backendApiClearCacheToken = process.env.BACKEND_API_CACHE_TOKEN;
    if(!backendApiClearCacheToken)
        throw "Error: api token not configured";

    api.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    api.get('/v1/nodes', (req, res) => res.send(nodes));
    api.get('/v1/clear-cache', async (req, res) => {
        if(req.param("token") !== backendApiClearCacheToken){
            res.send("invalid token");
            return;
        }

        nodes = await nodeRepository.findAllNodes();
        res.send("cache cleared!");
    });

    api.listen(port, () => console.log('api listening on port: ' + port));
};

listen();