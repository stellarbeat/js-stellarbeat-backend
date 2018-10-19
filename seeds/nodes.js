const fs = require('await-fs');
const Node = require('@stellarbeat/js-stellar-domain').Node;

exports.seed = async function (knex, Promise) {
    let nodesJSON = await fs.readFile("./seeds/nodes.json");
    let nodesRaw = JSON.parse(nodesJSON);

    let nodes = nodesRaw.map((node) => {
        return Node.fromJSON(node);
    });

    nodes = nodes.filter(node => node.publicKey);

    await knex('nodes').truncate();
    await Promise.all(nodes.map(async node => await knex('nodes').insert({
            'public_key': node.publicKey,
            'data': JSON.stringify(node)
        })
    ))
};