import { injectable } from 'inversify';
import { StellarCoreVersion } from '../../network/StellarCoreVersion';
import { NodeMeasurementAverage } from '../NodeMeasurementAverage';
import { NodeScan } from './NodeScan';
import { NodeIndexer } from './NodeIndexer';
import 'reflect-metadata';

@injectable()
export class NodeScannerIndexerStep {
	public execute(
		nodeScan: NodeScan,
		measurement30DayAverages: NodeMeasurementAverage[],
		stellarCoreVersion: StellarCoreVersion
	): void {
		nodeScan.updateIndexes(
			NodeIndexer.calculateIndexes(
				nodeScan.nodes,
				measurement30DayAverages,
				stellarCoreVersion
			)
		);
	}
}
