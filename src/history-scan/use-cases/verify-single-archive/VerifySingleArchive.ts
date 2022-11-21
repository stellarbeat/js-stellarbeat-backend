import { Url } from '../../../shared/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { Scanner } from '../../domain/history-archive-scan/Scanner';
import { inject, injectable } from 'inversify';
import { ScanRepository } from '../../domain/history-archive-scan/ScanRepository';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { Scan } from '../../domain/history-archive-scan/Scan';
import { TYPES } from '../../infrastructure/di/di-types';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { VerifySingleArchiveDTO } from './VerifySingleArchiveDTO';

@injectable()
export class VerifySingleArchive {
	constructor(
		private scanner: Scanner,
		@inject(TYPES.HistoryArchiveScanRepository)
		private scanRepository: ScanRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	public async execute(
		verifySingleArchiveDTO: VerifySingleArchiveDTO
	): Promise<Result<void, Error>> {
		try {
			const historyArchiveOrError = await VerifySingleArchive.getArchiveUrl(
				verifySingleArchiveDTO.historyUrl
			);
			if (historyArchiveOrError.isErr()) {
				//stop the script
				this.exceptionLogger.captureException(historyArchiveOrError.error);
				return err(historyArchiveOrError.error);
			}

			await this.scanArchive(
				historyArchiveOrError.value,
				verifySingleArchiveDTO.persist,
				verifySingleArchiveDTO.fromLedger,
				verifySingleArchiveDTO.toLedger,
				verifySingleArchiveDTO.maxConcurrency
			);
		} catch (e) {
			this.exceptionLogger.captureException(mapUnknownToError(e));
			await asyncSleep(600000); //sleep ten minutes and try again
		}
		return ok(undefined);
	}

	private static async getArchiveUrl(
		historyUrl: string
	): Promise<Result<Url, Error>> {
		const historyBaseUrl = Url.create(historyUrl);

		if (historyBaseUrl.isErr()) {
			return err(historyBaseUrl.error);
		}

		return ok(historyBaseUrl.value);
	}

	private async scanArchive(
		archive: Url,
		persist = false,
		fromLedger?: number,
		toLedger?: number,
		concurrency?: number
	) {
		const scan = Scan.startNewScanChain(
			new Date(),
			fromLedger ?? 0,
			archive,
			concurrency
		);
		await this.scanner.perform(scan, toLedger, concurrency);

		console.log(scan);
		//todo: logger
		if (persist) await this.persist(scan);
	}

	private async persist(scan: Scan) {
		try {
			await this.scanRepository.save([scan]);
		} catch (e: unknown) {
			this.exceptionLogger.captureException(mapUnknownToError(e));
		}
	}
}
