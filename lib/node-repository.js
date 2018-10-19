// 
const environment = process.env.NODE_ENV || 'development';
const flexConfig = require('../knexfile.js')[environment];
const knex = require("knex")(flexConfig);

const Node = require("@stellarbeat/js-stellar-domain").Node;

const findAllNodes = async () => {
    console.log("[DB " + environment + "] Finding all nodes");
    let nodes = await knex.select('data').from('nodes');
    return nodes.map(node => {
        return Node.fromJSON(node.data)
    });
};

const deleteAllNodes = async () => {
    console.log("[DB " + environment + "] Deleting all nodes" );
    await knex('nodes').truncate();
};

const addNode = async (node) => {
    if(!node.publicKey){
        throw new Error("cannot persist node without public key");
    }
    await knex('nodes').insert(
        {
            public_key: node.publicKey,
            data: JSON.stringify(node)
        }
    );
};

const destroyConnection = async () => {
    console.log("[DB " + environment + "] Destroying connection");
    await knex.destroy();
};

module.exports = {
    'findAllNodes' : findAllNodes,
    'addNode': addNode,
    'destroyConnection': destroyConnection,
    'deleteAllNodes': deleteAllNodes
};