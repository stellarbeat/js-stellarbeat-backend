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
const Knex = require("knex");
const js_stellar_domain_1 = require("@stellarbeat/js-stellar-domain");
const environment = process.env.NODE_ENV || 'development';
const flexConfig = require('../knexfile.js');
const knex = Knex(flexConfig);
const findAllNodes = () => __awaiter(this, void 0, void 0, function* () {
    console.log("[DB " + environment + "] Finding all nodes");
    let nodes = yield knex.select('data').from('nodes');
    return nodes.map(node => {
        return js_stellar_domain_1.Node.fromJSON(node.data);
    });
});
const deleteAllNodes = () => __awaiter(this, void 0, void 0, function* () {
    console.log("[DB " + environment + "] Deleting all nodes");
    yield knex('nodes').truncate();
});
const addNode = (node) => __awaiter(this, void 0, void 0, function* () {
    if (!node.publicKey) {
        throw new Error("cannot persist node without public key");
    }
    yield knex('nodes').insert({
        public_key: node.publicKey,
        data: JSON.stringify(node)
    });
});
const destroyConnection = () => __awaiter(this, void 0, void 0, function* () {
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