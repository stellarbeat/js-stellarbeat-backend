import { injectable } from 'inversify';
import { NodeScan } from './NodeScan';
import { NodeTomlFetcher } from './NodeTomlFetcher';

@injectable()
export class NodeScannerTomlStep {
	constructor(private nodeTomlFetcher: NodeTomlFetcher) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		nodeScan.updateWithTomlInfo(
			await this.nodeTomlFetcher.fetchNodeTomlInfoCollection(
				nodeScan.getHomeDomains()
			)
		);
	}
}
