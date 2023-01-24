import { HomeDomainFetcher } from './HomeDomainFetcher';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { NodeScan } from './NodeScan';

@injectable()
export class NodeScannerHomeDomainStep {
	constructor(
		private homeDomainFetcher: HomeDomainFetcher,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		this.logger.info('Updating home domains');
		await nodeScan.updateHomeDomains(
			await this.homeDomainFetcher.fetchHomeDomains(nodeScan.getPublicKeys())
		);
	}
}
