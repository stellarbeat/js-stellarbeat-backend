import { TomlService } from '../../network/scan/TomlService';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { NodeScan } from './NodeScan';

@injectable()
export class NodeScannerTomlStep {
	constructor(
		private tomlService: TomlService,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		this.logger.info('updating node-details from TOML');
		await nodeScan.updateWithTomlInfo(
			await this.tomlService.fetchNodeTomlInfoCollection(
				nodeScan.getHomeDomains()
			)
		);
	}
}
