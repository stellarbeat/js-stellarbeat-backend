"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Knex = require("knex");
const js_stellar_domain_1 = require("@stellarbeat/js-stellar-domain");
const environment = process.env.NODE_ENV || 'development';
const flexConfig = require('../knexfile.js');
const knex = Knex(flexConfig);
const findAllNodes = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
    console.log("[DB " + environment + "] Finding all nodes");
    let nodes = yield knex.select('data').from('nodes');
    return nodes.map(node => {
        return js_stellar_domain_1.Node.fromJSON(node.data);
    });
});
const deleteAllNodes = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
    console.log("[DB " + environment + "] Deleting all nodes");
    yield knex('nodes').truncate();
});
const addNode = (node) => tslib_1.__awaiter(this, void 0, void 0, function* () {
    if (!node.publicKey) {
        throw new Error("cannot persist node without public key");
    }
    yield knex('nodes').insert({
        public_key: node.publicKey,
        data: JSON.stringify(node)
    });
});
const destroyConnection = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
    console.log("[DB " + environment + "] Destroying connection");
    yield knex.destroy();
});
exports.default = {
    'findAllNodes': findAllNodes,
    'addNode': addNode,
    'destroyConnection': destroyConnection,
    'deleteAllNodes': deleteAllNodes
};
//# sourceMappingURL=node-repository.js.map