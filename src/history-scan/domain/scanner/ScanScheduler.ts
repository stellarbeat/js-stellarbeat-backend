import { Scan } from '../scan/Scan';
import { Url } from '../../../core/domain/Url';
import { sortHistoryUrls } from './sortHistoryUrls';
import { ScanJob } from '../scan/ScanJob';

export interface ScanScheduler {
	schedule(archives: Url[], previousScans: Scan[]): ScanJob[];
}

export class RestartAtLeastOneScan implements ScanScheduler {
	schedule(archives: Url[], previousScans: Scan[]): ScanJob[] {
		const scanJobs: ScanJob[] = [];
		const uniqueArchives = this.removeDuplicates(archives);
		const previousScansMap = new Map(
			previousScans.map((scan) => {
				return [scan.baseUrl.value, scan];
			})
		);

		const archivesSortedByInitDate = sortHistoryUrls(
			uniqueArchives,
			new Map(
				previousScans
					.filter((scan) => scan.scanChainInitDate !== null)
					.map((scan) => {
						return [scan.baseUrl.value, scan.scanChainInitDate];
					})
			)
		);

		//we want to start at least one scan from the very beginning
		let hasAtLeastOneInitScan = false;
		archivesSortedByInitDate.forEach((archive) => {
			if (!hasAtLeastOneInitScan) {
				hasAtLeastOneInitScan = true;
				scanJobs.push(ScanJob.newScanChain(archive));
				return;
			}

			const previousScan = previousScansMap.get(archive.value);
			if (!previousScan) {
				scanJobs.push(ScanJob.newScanChain(archive));
			} else {
				scanJobs.push(ScanJob.continueScanChain(previousScan));
			}
		});

		return scanJobs;
	}

	private removeDuplicates(urls: Url[]): Url[] {
		const uniqueUrls = Array.from(new Set(urls.map((url) => url.value)));

		return uniqueUrls
			.map((urlString) => {
				const url = Url.create(urlString);
				if (url.isErr()) return undefined;
				return url.value;
			})
			.filter((url): url is Url => url instanceof Url);
	}
}
