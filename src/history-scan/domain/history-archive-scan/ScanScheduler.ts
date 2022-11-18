import { Scan } from './Scan';
import { Url } from '../../../shared/domain/Url';
import { sortHistoryUrls } from './sortHistoryUrls';

export interface ScanScheduler {
	schedule(archives: Url[], previousScans: Scan[]): Scan[];
}

export class RestartAtLeastOneScan implements ScanScheduler {
	schedule(archives: Url[], previousScans: Scan[]): Scan[] {
		const scans: Scan[] = [];
		const uniqueArchives = this.removeDuplicates(archives);
		const previousScansMap = new Map(
			previousScans.map((scan) => {
				return [scan.baseUrl.value, scan];
			})
		);

		const archivesSortedByInitDate = sortHistoryUrls(
			uniqueArchives,
			new Map(
				previousScans.map((scan) => {
					return [scan.baseUrl.value, scan.initializeDate];
				})
			)
		);

		//we want to start at least one scan from the very beginning
		let hasAtLeastOneInitScan = false;
		archivesSortedByInitDate.forEach((archive) => {
			if (!hasAtLeastOneInitScan) {
				hasAtLeastOneInitScan = true;
				scans.push(Scan.init(new Date(), 0, archive));
				return;
			}

			const previousScan = previousScansMap.get(archive.value);
			if (!previousScan) {
				scans.push(Scan.init(new Date(), 0, archive));
			} else {
				Scan.continue(previousScan, new Date());
			}
		});

		return scans;
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
