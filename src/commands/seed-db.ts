import { NetworkUpdatePersister } from '../network-updater/services/NetworkUpdatePersister';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('await-fs');
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import NetworkUpdate from '../storage/entities/NetworkUpdate';
import Kernel from '../Kernel';
import { Connection } from 'typeorm';
import { getConfigFromEnv } from '../Config';
// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	if (process.argv.length <= 2) {
		console.log('Usage: ' + __filename + ' nodes.json');

		process.exit(-1);
	}
	const nodesPath = process.argv[2];
	const nodesJSON = await fs.readFile(nodesPath);
	const nodesRaw = JSON.parse(nodesJSON);

	const nodes: Node[] = nodesRaw.map((node: any): Node => {
		return Node.fromJSON(node);
	});
	const kernel = new Kernel();
	const configResult = getConfigFromEnv();
	if (configResult.isErr()) {
		console.log('Invalid configuration');
		console.log(configResult.error.message);
		return;
	}

	const config = configResult.value;
	await kernel.initializeContainer(config);
	const crawlResultProcessor = kernel.container.get(NetworkUpdatePersister);
	const crawlV2 = new NetworkUpdate(new Date());
	await crawlResultProcessor.persistNetworkUpdate(
		crawlV2,
		new Network(nodes, [])
	);

	await kernel.container.get(Connection).close();
}
