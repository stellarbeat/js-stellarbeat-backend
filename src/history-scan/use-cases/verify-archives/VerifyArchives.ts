import { Url } from '../../../shared/domain/Url';
import { Scanner } from '../../domain/history-archive-scan/Scanner';
import { inject, injectable } from 'inversify';
import { ScanRepository } from '../../domain/history-archive-scan/ScanRepository';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { Scan } from '../../domain/history-archive-scan/Scan';
import { TYPES } from '../../infrastructure/di/di-types';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { ScanScheduler } from '../../domain/history-archive-scan/ScanScheduler';
import { VerifyArchivesDTO } from './VerifyArchivesDTO';
import { ScanJob } from '../../domain/history-archive-scan/ScanJob';
import { HistoryArchiveService } from '../../domain/history-archive/HistoryArchiveService';

@injectable()
export class VerifyArchives {
	constructor(
		private scanner: Scanner,
		@inject(TYPES.HistoryArchiveScanRepository)
		private scanRepository: ScanRepository,
		@inject(TYPES.HistoryArchiveService)
		private historyArchiveService: HistoryArchiveService,
		@inject(TYPES.ScanScheduler)
		private scanScheduler: ScanScheduler,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	public async execute(verifyArchivesDTO: VerifyArchivesDTO): Promise<void> {
		const shutDown = false; //todo: implement graceful shutdown
		do {
			try {
				const historyArchivesOrError =
					await this.historyArchiveService.getHistoryArchiveUrls();
				if (historyArchivesOrError.isErr()) {
					this.exceptionLogger.captureException(historyArchivesOrError.error);
					await asyncSleep(60 * 60000); //maybe temporary db connection error
					continue;
				}

				await this.scanArchives(
					historyArchivesOrError.value,
					verifyArchivesDTO.persist
				);
			} catch (e) {
				this.exceptionLogger.captureException(mapUnknownToError(e));
				await asyncSleep(60 * 60000);
			}
		} while (!shutDown && verifyArchivesDTO.loop);
	}

	private async scanArchives(archives: Url[], persist = false) {
		const previousScans = await this.scanRepository.findLatest();
		const scanJobs = this.scanScheduler.schedule(archives, previousScans);
		console.log(scanJobs);
		for (const scanJob of scanJobs) {
			await this.perform(scanJob, persist);
		}
	}

	private async perform(scanJob: ScanJob, persist = false) {
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
