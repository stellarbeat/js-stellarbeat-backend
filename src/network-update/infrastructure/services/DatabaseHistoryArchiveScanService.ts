import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { ScanRepository } from '../../../history-scan/domain/history-archive-scan/ScanRepository';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { injectable } from 'inversify';
import { HistoryArchiveScan } from '@stellarbeat/js-stellar-domain';
import { ScanErrorType } from '../../../history-scan/domain/history-archive-scan/ScanError';

//only dependency with history-archive package.
@injectable()
export class DatabaseHistoryArchiveScanService
	implements HistoryArchiveScanService
{
	constructor(private historyArchiveScanRepository: ScanRepository) {}

	async findLatestScans(): Promise<Result<HistoryArchiveScan[], Error>> {
		try {
			const scans = await this.historyArchiveScanRepository.findLatest();
			const finishedScans = scans.filter((scan) => scan.endDate !== undefined);
			return ok(
				finishedScans.map(
					(scan) =>
						new HistoryArchiveScan(
							scan.baseUrl.value,
							scan.startDate as Date,
							scan.endDate as Date,
							scan.latestVerifiedLedger,
							scan.errorType === ScanErrorType.TYPE_VERIFICATION,
							scan.errorType === ScanErrorType.TYPE_VERIFICATION
								? scan.errorUrl
								: null,
							scan.errorType === ScanErrorType.TYPE_VERIFICATION
								? scan.errorMessage
								: null,
							scan.isSlowArchive === true ? scan.isSlowArchive : false
						)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
