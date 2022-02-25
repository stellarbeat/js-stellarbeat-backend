import { ScanGapsDTO } from './ScanGapsDTO';
import { HistoryArchive } from '../../domain/HistoryArchive';
import { Url } from '../../../shared/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { inject, injectable } from 'inversify';
import { HistoryArchiveScanRepository } from '../../domain/HistoryArchiveScanRepository';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';

@injectable()
export class ScanGaps {
	constructor(
		private historyArchiveScanner: HistoryArchiveScanner,
		@inject('HistoryArchiveScanRepository')
		private historyArchiveScanRepository: HistoryArchiveScanRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	public async execute(scanGapsDTO: ScanGapsDTO): Promise<Result<void, Error>> {
		do {
			const historyArchivesOrError = await this.getArchives(
				scanGapsDTO.historyUrl
			);
			if (historyArchivesOrError.isErr()) {
				//stop the script
				this.exceptionLogger.captureException(historyArchivesOrError.error);
				return err(historyArchivesOrError.error);
			}

			await this.scanArchives(
				historyArchivesOrError.value,
				scanGapsDTO.persist,
				scanGapsDTO.concurrency,
				scanGapsDTO.fromLedger,
				scanGapsDTO.toLedger
			);
		} while (scanGapsDTO.loop);

		return ok(undefined);
	}

	//if no history url supplied, we fetch all the known active history urls from db
	private async getArchives(
		historyUrl?: string
	): Promise<Result<Url[], Error>> {
		const historyUrls: Url[] = [];
		if (historyUrl) {
			const historyBaseUrl = Url.create(historyUrl);

			if (historyBaseUrl.isErr()) {
				return err(historyBaseUrl.error);
			}

			historyUrls.push(historyBaseUrl.value);
		} else {
			//gotta catch em all
		}

		return ok(historyUrls);
	}

	private async scanArchives(
		archives: Url[],
		persist = false,
		concurrency: number,
		fromLedger?: number,
		toLedger?: number
	) {
		for (let i = 0; i < archives.length; i++) {
			const historyArchive = new HistoryArchive(archives[i]);
			const historyArchiveScanOrError = await this.historyArchiveScanner.scan(
				historyArchive,
				new Date(),
				concurrency,
				fromLedger,
				toLedger
			);

			if (historyArchiveScanOrError.isErr()) {
				this.exceptionLogger.captureException(historyArchiveScanOrError.error);
				continue;
			}

			try {
				if (persist)
					await this.historyArchiveScanRepository.save([
						historyArchiveScanOrError.value
					]);
				else console.log(historyArchiveScanOrError);
			} catch (e: unknown) {
				this.exceptionLogger.captureException(mapUnknownToError(e));
			}
		}
	}
}
