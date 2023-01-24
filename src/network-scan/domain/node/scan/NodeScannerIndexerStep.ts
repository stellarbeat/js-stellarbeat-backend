import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { StellarCoreVersion } from '../../network/StellarCoreVersion';
import { NodeMeasurementAverage } from '../NodeMeasurementAverage';
import { NodeScan } from './NodeScan';
import { NodeIndexer } from './NodeIndexer';
import 'reflect-metadata';

@injectable()
export class NodeScannerIndexerStep {
	constructor(
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(
		nodeScan: NodeScan,
		measurement30DayAverages: NodeMeasurementAverage[],
		stellarCoreVersion: StellarCoreVersion
	): Promise<void> {
		this.logger.info('calculating indexes');
		nodeScan.updateIndexes(
			NodeIndexer.calculateIndexes(
				nodeScan.nodes,
				measurement30DayAverages,
				stellarCoreVersion
			)
		);
	}
}
