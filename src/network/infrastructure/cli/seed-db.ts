import { NetworkWriteRepository } from '../../repositories/NetworkWriteRepository';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('await-fs');
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import NetworkUpdate from '../../domain/NetworkUpdate';
import Kernel from '../../../shared/core/Kernel';
import { Connection } from 'typeorm';
import { getConfigFromEnv } from '../../../config/Config';
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

	const nodes: Node[] = nodesRaw.map((node: Record<string, unknown>): Node => {
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
	const networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	const networkUpdate = new NetworkUpdate(new Date());
	await networkWriteRepository.save(networkUpdate, new Network(nodes, []));

	await kernel.container.get(Connection).close();
}
