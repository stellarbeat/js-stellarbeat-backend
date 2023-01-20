import { injectable } from 'inversify';
import { HistoryService } from './history/HistoryService';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { queue } from 'async';
import { NodeScanMeasurement } from './NodeScanProps';

@injectable()
export class HistoryArchiveStatusFinder {
	protected historyService: HistoryService;

	constructor(historyService: HistoryService) {
		this.historyService = historyService;
	}

	async getNodesWithUpToDateHistoryArchives(
		publicKeyToHistoryArchiveMap: Map<string, string>,
		latestLedger: string
	): Promise<Set<string>> {
		const upToDateNodes = new Set<string>();
		const q = queue(
			async (record: { publicKey: string; url: string }, callback) => {
				const upToDate = await this.historyService.stellarHistoryIsUpToDate(
					record.url,
					latestLedger
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

		if (q.length() === 0) upToDateNodes;

		await q.drain();

		return upToDateNodes;
	}

	async updateArchiveVerificationStatus(
		nodes: NodeDTO[],
		nodeScanMeasurements: NodeScanMeasurement[]
	): Promise<void> {
		const historyUrlsWithErrors =
			await this.historyService.getHistoryUrlsWithScanErrors(
				nodes
					.filter((node) => node.historyUrl)
					.map((node) => node.historyUrl as string)
			);

		//todo: how to handle null values for historyArchiveHasError
		if (historyUrlsWithErrors.isErr()) return;

		nodes.forEach((node) => {
			if (node.historyUrl && historyUrlsWithErrors.value.has(node.historyUrl)) {
				node.historyArchiveHasError = true;
			} else node.historyArchiveHasError = false;

			const measurement = nodeScanMeasurements.find(
				(measurement) => measurement.publicKey === node.publicKey
			);
			if (measurement) {
				measurement.historyArchiveHasError = node.historyArchiveHasError;
			} else {
				//throw new Error('measurement not found'); todo: enable when we get rid of NodeDTO dependency
			}
		});
	}
}
