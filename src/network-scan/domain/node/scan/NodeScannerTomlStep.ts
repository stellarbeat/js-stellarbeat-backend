import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { NodeScan } from './NodeScan';
import { NodeTomlFetcher } from './NodeTomlFetcher';

@injectable()
export class NodeScannerTomlStep {
	constructor(
		private nodeTomlFetcher: NodeTomlFetcher,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		this.logger.info('updating node-details from TOML');
		await nodeScan.updateWithTomlInfo(
			await this.nodeTomlFetcher.fetchNodeTomlInfoCollection(
				nodeScan.getHomeDomains()
			)
		);
	}
}
