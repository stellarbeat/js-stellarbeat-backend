import { injectable } from 'inversify';
import { HistoryService } from './history/HistoryService';
import { queue } from 'async';

@injectable()
export class HistoryArchiveStatusFinder {
	protected historyService: HistoryService;

	constructor(historyService: HistoryService) {
		this.historyService = historyService;
	}

	async getNodesWithUpToDateHistoryArchives(
		publicKeyToHistoryArchiveMap: Map<string, string>,
		latestLedger: bigint
	): Promise<Set<string>> {
		const upToDateNodes = new Set<string>();
		const q = queue(
			async (record: { publicKey: string; url: string }, callback) => {
				const upToDate = await this.historyService.stellarHistoryIsUpToDate(
					record.url,
					latestLedger.toString()
				);
				if (upToDate) upToDateNodes.add(record.publicKey);
				callback();
			},
			10
		);

		publicKeyToHistoryArchiveMap.forEach((historyArchiveUrl, publicKey) =>
			q.push({
				publicKey: publicKey,
				url: historyArchiveUrl
			})
		);

		if (q.length() === 0) return upToDateNodes;

		await q.drain();

		return upToDateNodes;
	}

	async getNodesWithHistoryArchiveVerificationErrors(
		publicKeyToHistoryArchiveMap: Map<string, string>
	): Promise<Set<string>> {
		const nodesWithHistoryArchiveVerificationErrors = new Set<string>();
		const historyUrlsWithErrors =
			await this.historyService.getHistoryUrlsWithScanErrors(
				Array.from(publicKeyToHistoryArchiveMap.values())
			);

		if (historyUrlsWithErrors.isErr())
			return nodesWithHistoryArchiveVerificationErrors;

		publicKeyToHistoryArchiveMap.forEach((historyArchiveUrl, publicKey) => {
			if (historyUrlsWithErrors.value.has(historyArchiveUrl))
				nodesWithHistoryArchiveVerificationErrors.add(publicKey);
		});

		return nodesWithHistoryArchiveVerificationErrors;
	}
}
