import { HistoryArchiveScanService } from '../../domain/history/HistoryArchiveScanService';
import { ScanRepository } from '../../../history-scan/domain/scan/ScanRepository';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { HistoryArchiveScan } from '@stellarbeat/js-stellar-domain';
import { TYPES } from '../../../history-scan/infrastructure/di/di-types';

//only dependency with history-archive package.
@injectable()
export class DatabaseHistoryArchiveScanService
	implements HistoryArchiveScanService
{
	constructor(
		@inject(TYPES.HistoryArchiveScanRepository)
		private historyArchiveScanRepository: ScanRepository
	) {}

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
							scan.error !== null,
							scan.error ? scan.error.url : null,
							scan.error ? scan.error.message : null,
							scan.isSlowArchive === true ? scan.isSlowArchive : false
						)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
