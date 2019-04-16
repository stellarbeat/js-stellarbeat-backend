import * as Knex from 'knex';
import {Node} from "@stellarbeat/js-stellar-domain";

const environment = process.env.NODE_ENV || 'development';
const flexConfig = require('../knexfile.js');
const knex = Knex(flexConfig);
import * as Sentry from "@sentry/node";

Sentry.init({dsn: process.env.SENTRY_DSN});

//@todo typeorm https://github.com/typeorm/typeorm

export class NodeRepository {

    async findAllNodes() {
        console.log("[DB " + environment + "] Finding all nodes");
        let nodes: Array<any> = await knex.select('data').from('nodes');
        return nodes.map(node => {
            return Node.fromJSON(node.data)
        });
    }

    async findByPublicKey(publicKey: string) {
        console.log("[DB " + environment + "] Finding toNode: " + publicKey);
        let results = await knex('nodes').where({
            'public_key': publicKey
        }).select('data');
        if (results.length === 0) {
            return null;
        }

        return Node.fromJSON(results[0].data);
    }

    async updateOrCreateNodes(nodes: Array<Node>) {
        await Promise.all(
            nodes.map(
                async (node: Node) => {
                    try {
                        let foundNode = await this.findByPublicKey(node.publicKey);
                        if (foundNode) {
                            await this.updateNode(node);
                        } else {
                            await this.addNode(node);
                        }
                    } catch (e) {
                        Sentry.captureException(e);
                    }
                }
            )
        );
    }

    async addNode(node: Node) {
        if (!node.publicKey) {
            throw new Error("cannot persist node without public key");
        }
        await knex('nodes').insert(
            {
                public_key: node.publicKey,
                data: JSON.stringify(node)
            }
        );
    };

    async updateNode(node: Node) {
        console.log("[DB " + environment + "] Updating toNode: " + node.publicKey);
        await knex('nodes').where('public_key', '=', node.publicKey).update(
            {
                data: JSON.stringify(node)
            }
        );
    }

    async deleteAllNodes() {
        console.log("[DB " + environment + "] Deleting all nodes" );
        await knex('nodes').truncate();
    }

    async destroyConnection() {
        console.log("[DB " + environment + "] Destroying connection");
        await knex.destroy();
    }
}