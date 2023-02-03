import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { err, ok, Result } from 'neverthrow';
import { QuorumSet } from '../../network/QuorumSet';
import { StellarCoreVersion } from '../../network/StellarCoreVersion';
import { NodeMeasurementAverage } from '../NodeMeasurementAverage';
import { NodeScan } from './NodeScan';
import { NodeScannerCrawlStep } from './NodeScannerCrawlStep';
import { NodeScannerHomeDomainStep } from './NodeScannerHomeDomainStep';
import { NodeScannerTomlStep } from './NodeScannerTomlStep';
import { NodeScannerHistoryArchiveStep } from './NodeScannerHistoryArchiveStep';
import { NodeScannerGeoStep } from './NodeScannerGeoStep';
import { NodeScannerIndexerStep } from './NodeScannerIndexerStep';
import { NodeAddress } from '../NodeAddress';

@injectable()
export class NodeScanner {
	constructor(
		private crawlerStep: NodeScannerCrawlStep,
		private homeDomainStep: NodeScannerHomeDomainStep,
		private tomlStep: NodeScannerTomlStep,
		private historyArchiveStep: NodeScannerHistoryArchiveStep,
		private geoStep: NodeScannerGeoStep,
		private indexerStep: NodeScannerIndexerStep,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(
		nodeScan: NodeScan,
		networkQuorumSetConfiguration: QuorumSet,
		stellarCoreVersion: StellarCoreVersion,
		measurement30DayAverages: NodeMeasurementAverage[],
		previousLatestLedger: bigint | null = null,
		previousLatestLedgerCloseTime: Date | null = null,
		bootstrapNodeAddresses: NodeAddress[] = []
	): Promise<Result<NodeScan, Error>> {
		this.logger.info('Starting new node-scan with crawl');
		const nodeScanOrError = await this.crawlerStep.execute(
			nodeScan,
			networkQuorumSetConfiguration,
			previousLatestLedger,
			previousLatestLedgerCloseTime,
			bootstrapNodeAddresses
		);
		if (nodeScanOrError.isErr()) {
			return err(nodeScanOrError.error);
		}

		this.logger.info('Updating home domains');
		await this.homeDomainStep.execute(nodeScan);

		this.logger.info('updating node-details from TOML');
		await this.tomlStep.execute(nodeScan);

		this.logger.info('Updating history archive status');
		await this.historyArchiveStep.execute(nodeScan);

		this.logger.info('Updating geo data');
		await this.geoStep.execute(nodeScan);

		this.logger.info('calculating indexes');
		this.indexerStep.execute(
			nodeScan,
			measurement30DayAverages,
			stellarCoreVersion
		);

		return ok(nodeScan);
	}
}
