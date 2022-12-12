import { Url } from '../../../core/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { Scanner } from '../../domain/scanner/Scanner';
import { inject, injectable } from 'inversify';
import { ScanRepository } from '../../domain/scan/ScanRepository';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { Scan } from '../../domain/scan/Scan';
import { TYPES } from '../../infrastructure/di/di-types';
import { VerifySingleArchiveDTO } from './VerifySingleArchiveDTO';
import { ScanJob } from '../../domain/scan/ScanJob';

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
		const scanJob = ScanJob.newScanChain(
			archive,
			fromLedger,
			toLedger,
			concurrency
		);
		const scan = await this.scanner.perform(new Date(), scanJob);

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
