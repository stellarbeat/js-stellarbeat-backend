import { injectable } from 'inversify';
import { HistoryService } from './history/HistoryService';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { queue } from 'async';
import { NodeScanResult } from './NodeScanResult';

@injectable()
export class FullValidatorUpdater {
	protected historyService: HistoryService;

	constructor(historyService: HistoryService) {
		this.historyService = historyService;
	}

	async updateFullValidatorStatus(
		nodes: NodeDTO[], //todo: rip out
		nodeScanResults: NodeScanResult[],
		latestLedger: string
	): Promise<void> {
		const q = queue(async (node: NodeDTO, callback) => {
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
			const nodeScanResult = nodeScanResults.find(
				(result) => result.publicKey === node.publicKey
			);
			if (nodeScanResult)
				nodeScanResult.historyArchiveUpToDate = node.isFullValidator;
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

	async updateArchiveVerificationStatus(
		nodes: NodeDTO[],
		nodeScanResults: NodeScanResult[]
	): Promise<void> {
		const historyUrlsWithErrors =
			await this.historyService.getHistoryUrlsWithScanErrors(
				nodes
					.filter((node) => node.historyUrl)
					.map((node) => node.historyUrl as string)
			);

		//todo: how to handle null values for historyArchiveHasError
		if (historyUrlsWithErrors.isErr()) return;

		nodes
			.filter(
				(node) =>
					node.historyUrl && historyUrlsWithErrors.value.has(node.historyUrl)
			)
			.forEach((node) => {
				node.historyArchiveHasError = true;
			});

		nodeScanResults.forEach((nodeScanResult) => {
			if (
				nodeScanResult.historyArchiveUrl &&
				historyUrlsWithErrors.value.has(nodeScanResult.historyArchiveUrl)
			) {
				nodeScanResult.historyArchiveHasError = true;
			} else {
				nodeScanResult.historyArchiveHasError = false;
			}
		});
	}
}
