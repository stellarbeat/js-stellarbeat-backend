import { HistoryArchiveStatusFinder } from './HistoryArchiveStatusFinder';
import { injectable } from 'inversify';
import { NodeScan } from './NodeScan';

@injectable()
export class NodeScannerHistoryArchiveStep {
	constructor(private historyArchiveStatusFinder: HistoryArchiveStatusFinder) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		nodeScan.updateHistoryArchiveUpToDateStatus(
			await this.historyArchiveStatusFinder.getNodesWithUpToDateHistoryArchives(
				nodeScan.getHistoryArchiveUrls(),
				nodeScan.latestLedger
			)
		);
		nodeScan.updateHistoryArchiveVerificationStatus(
			await this.historyArchiveStatusFinder.getNodesWithHistoryArchiveVerificationErrors(
				nodeScan.getHistoryArchiveUrls()
			)
		);
	}
}
