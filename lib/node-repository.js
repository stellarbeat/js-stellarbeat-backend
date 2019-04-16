"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Knex = require("knex");
const js_stellar_domain_1 = require("@stellarbeat/js-stellar-domain");
const environment = process.env.NODE_ENV || 'development';
const flexConfig = require('../knexfile.js');
const knex = Knex(flexConfig);
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
//@todo typeorm https://github.com/typeorm/typeorm
class NodeRepository {
    findAllNodes() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            console.log("[DB " + environment + "] Finding all nodes");
            let nodes = yield knex.select('data').from('nodes');
            return nodes.map(node => {
                return js_stellar_domain_1.Node.fromJSON(node.data);
            });
        });
    }
    findByPublicKey(publicKey) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            console.log("[DB " + environment + "] Finding toNode: " + publicKey);
            let results = yield knex('nodes').where({
                'public_key': publicKey
            }).select('data');
            if (results.length === 0) {
                return null;
            }
            return js_stellar_domain_1.Node.fromJSON(results[0].data);
        });
    }
    updateOrCreateNodes(nodes) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield Promise.all(nodes.map((node) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    let foundNode = yield this.findByPublicKey(node.publicKey);
                    if (foundNode) {
                        yield this.updateNode(node);
                    }
                    else {
                        yield this.addNode(node);
                    }
                }
                catch (e) {
                    Sentry.captureException(e);
                }
            })));
        });
    }
    addNode(node) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!node.publicKey) {
                throw new Error("cannot persist node without public key");
            }
            yield knex('nodes').insert({
                public_key: node.publicKey,
                data: JSON.stringify(node)
            });
        });
    }
    ;
    updateNode(node) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            console.log("[DB " + environment + "] Updating toNode: " + node.publicKey);
            yield knex('nodes').where('public_key', '=', node.publicKey).update({
                data: JSON.stringify(node)
            });
        });
    }
    deleteAllNodes() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            console.log("[DB " + environment + "] Deleting all nodes");
            yield knex('nodes').truncate();
        });
    }
    destroyConnection() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            console.log("[DB " + environment + "] Destroying connection");
            yield knex.destroy();
        });
    }
}
exports.NodeRepository = NodeRepository;
//# sourceMappingURL=node-repository.js.map