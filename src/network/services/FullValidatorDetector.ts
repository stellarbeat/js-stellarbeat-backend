import { injectable } from 'inversify';
import { HistoryService } from './HistoryService';
import { Node } from '@stellarbeat/js-stellar-domain';
import { queue } from 'async';

@injectable()
export class FullValidatorDetector {
	protected historyService: HistoryService;

	constructor(historyService: HistoryService) {
		this.historyService = historyService;
	}

	async updateFullValidatorStatus(
		nodes: Node[],
		latestLedger: string
	): Promise<void> {
		const q = queue(async (node: Node, callback) => {
			if (!node.historyUrl) return;
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
}
