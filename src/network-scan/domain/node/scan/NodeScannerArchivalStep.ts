import { injectable } from 'inversify';
import { NodeScan } from './NodeScan';
import { ValidatorDemoter } from '../archival/ValidatorDemoter';
import { InactiveNodesArchiver } from '../archival/InactiveNodesArchiver';
import { TrustGraphFactory } from './TrustGraphFactory';

@injectable()
export class NodeScannerArchivalStep {
	constructor(
		private validatorDemoter: ValidatorDemoter,
		private inactiveNodesArchiver: InactiveNodesArchiver
	) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		const trustGraph = TrustGraphFactory.create(nodeScan.nodes);
		await this.validatorDemoter.demote(nodeScan, trustGraph, 2);
		await this.inactiveNodesArchiver.archive(nodeScan, trustGraph, 2);
	}
}
