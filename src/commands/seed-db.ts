import { CrawlResultProcessor } from '../services/CrawlResultProcessor';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('await-fs');
import { Node } from '@stellarbeat/js-stellar-domain';
import CrawlV2 from '../entities/CrawlV2';
import Kernel from '../Kernel';
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

	const nodes: Node[] = nodesRaw.map((node: any): Node => {
		return Node.fromJSON(node);
	});
	const kernel = new Kernel();
	await kernel.initializeContainer();
	const crawlResultProcessor = kernel.container.get(CrawlResultProcessor);
	const crawlV2 = new CrawlV2(new Date());
	await crawlResultProcessor.processCrawl(crawlV2, nodes, []);

	await kernel.container.get(Connection).close();
}
