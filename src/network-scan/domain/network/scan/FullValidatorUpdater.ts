import { injectable } from 'inversify';
import { HistoryService } from '../../node/history/HistoryService';
import { Node } from '@stellarbeat/js-stellar-domain';
import { queue } from 'async';

@injectable()
export class FullValidatorUpdater {
	protected historyService: HistoryService;

	constructor(historyService: HistoryService) {
		this.historyService = historyService;
	}

	async updateFullValidatorStatus(
		nodes: Node[],
		latestLedger: string
	): Promise<void> {
		const q = queue(async (node: Node, callback) => {
			if (!node.historyUrl || !node.isValidator) {
				node.isFullValidator = false;
				callback();
				return;
			}
			//todo: introduce isStellarHistoryUpToDate field. This way we can identify basic archivers
			node.isFullValidator = await this.historyService.stellarHistoryIsUpToDate(
				node.historyUrl,
				latestLedger
			);
			callback();
		}, 10);

		nodes.forEach((node) => {
			if (!node.historyUrl) {
				node.isFullValidator = false;
				return;
			}
			q.push(node);
		});

		if (q.length() === 0) return;

		await q.drain();
	}

	async updateArchiveVerificationStatus(nodes: Node[]) {
		await this.historyService.updateArchiveVerificationStatus(nodes);
	}
}
