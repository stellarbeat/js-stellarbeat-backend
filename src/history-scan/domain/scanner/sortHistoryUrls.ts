import { Url } from '../../../core/domain/Url';

type urlString = string;
//older or never before scanned urls go to the front
export function sortHistoryUrls(
	historyUrls: Url[],
	scanDates: Map<urlString, Date>
): Url[] {
	return historyUrls.sort((a: Url, b: Url): number => {
		const aScanDate = scanDates.get(a.value);
		const bScanDate = scanDates.get(b.value);

		if (!aScanDate) return -1;

		if (!bScanDate) return 1;

		return aScanDate.getTime() - bScanDate.getTime();
	});
}
