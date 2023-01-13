import { NetworkWriteRepository } from '../repositories/NetworkWriteRepository';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('await-fs');
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import Kernel from '../../../core/infrastructure/Kernel';
import { Connection } from 'typeorm';
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
	const kernel = await Kernel.getInstance();

	const networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	const scan = new NetworkScan(new Date());
	await networkWriteRepository.save(scan, new Network(nodes, []));

	await kernel.container.get(Connection).close();
}
