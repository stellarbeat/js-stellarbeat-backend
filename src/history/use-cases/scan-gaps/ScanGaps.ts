import { ScanGapsDTO } from './ScanGapsDTO';
import { HistoryArchive } from '../../domain/HistoryArchive';
import { Url } from '../../../shared/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { inject, injectable } from 'inversify';
import { HistoryArchiveScanRepository } from '../../domain/HistoryArchiveScanRepository';

@injectable()
export class ScanGaps {
	constructor(
		private historyArchiveScanner: HistoryArchiveScanner,
		@inject('HistoryArchiveScanRepository')
		private historyArchiveScanRepository: HistoryArchiveScanRepository
	) {}

	public async execute(scanGapsDTO: ScanGapsDTO): Promise<Result<void, Error>> {
		const historyBaseUrl = Url.create(scanGapsDTO.historyUrl);

		if (historyBaseUrl.isErr()) {
			return err(historyBaseUrl.error);
		}

		const historyArchive = new HistoryArchive(historyBaseUrl.value);
		const historyArchiveScan = await this.historyArchiveScanner.scanRange(
			historyArchive,
			scanGapsDTO.date,
			scanGapsDTO.toLedger,
			scanGapsDTO.fromLedger,
			scanGapsDTO.concurrency
		);

		console.log(historyArchiveScan);
		await this.historyArchiveScanRepository.save([historyArchiveScan]);

		return ok(undefined);
	}
}
