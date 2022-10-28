import { ScanGapsDTO } from './ScanGapsDTO';
import { Url } from '../../../shared/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { HistoryArchiveScanner } from '../../domain/history-archive-scan/HistoryArchiveScanner';
import { inject, injectable } from 'inversify';
import { HistoryArchiveScanRepository } from '../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { isString } from '../../../shared/utilities/TypeGuards';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { TYPES as SHARED_TYPES } from '../../../shared/core/di-types';
import { HistoryArchiveScan } from '../../domain/history-archive-scan/HistoryArchiveScan';
import { HistoryService } from '../../../network-update/domain/history/HistoryService';
import { TYPES } from '../../infrastructure/di/di-types';
import { sortHistoryUrls } from '../../domain/history-archive-scan/sortHistoryUrls';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { HistoryArchivePerformanceTester } from '../../domain/history-archive-scan/HistoryArchivePerformanceTester';

@injectable()
export class ScanGaps {
	constructor(
		private historyService: HistoryService, //todo: refactor out
		private historyArchiveScanner: HistoryArchiveScanner,
		@inject(TYPES.HistoryArchiveScanRepository)
		private historyArchiveScanRepository: HistoryArchiveScanRepository,
		@inject(SHARED_TYPES.NetworkReadRepository)
		private networkRepository: NetworkReadRepository,
		private historyArchivePerformanceTester: HistoryArchivePerformanceTester,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	public async execute(scanGapsDTO: ScanGapsDTO): Promise<Result<void, Error>> {
		do {
			try {
				const historyArchivesOrError = await this.getArchivesToScan(
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
					scanGapsDTO.fromLedger,
					scanGapsDTO.toLedger,
					scanGapsDTO.maxConcurrency
				);
			} catch (e) {
				this.exceptionLogger.captureException(mapUnknownToError(e));
				await asyncSleep(600000); //sleep ten minutes and try again
			}
		} while (scanGapsDTO.loop);

		return ok(undefined);
	}

	//if no history url supplied, we fetch all the known active history urls from db
	private async getArchivesToScan(
		historyUrl?: string
	): Promise<Result<Url[], Error>> {
		let historyUrls: Url[] = [];
		if (historyUrl) {
			const historyBaseUrl = Url.create(historyUrl);

			if (historyBaseUrl.isErr()) {
				return err(historyBaseUrl.error);
			}

			historyUrls.push(historyBaseUrl.value);
		} else {
			const historyUrlsOrError = await this.getAllArchives();
			if (historyUrlsOrError.isErr()) return err(historyUrlsOrError.error);
			historyUrls = historyUrlsOrError.value;
		}

		return ok(historyUrls);
	}

	private async getAllArchives(): Promise<Result<Url[], Error>> {
		const networkOrError = await this.networkRepository.getNetwork();
		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		const network = networkOrError.value;
		if (network === null) return err(new Error('No network found'));

		const historyUrls = Array.from(
			new Set<Url>( //filter out duplicates
				network.nodes
					.filter((node) => isString(node.historyUrl))
					.map((node) => {
						const historyUrlOrError = Url.create(node.historyUrl as string);
						if (historyUrlOrError.isErr()) {
							this.exceptionLogger.captureException(historyUrlOrError.error);
							return undefined;
						}
						return historyUrlOrError.value;
					})
					.filter((historyUrl) => historyUrl instanceof Url) as Url[]
			)
		);

		const previousScans = await this.historyArchiveScanRepository.findLatest();

		return ok(
			sortHistoryUrls(
				historyUrls,
				new Map(
					previousScans.map((scan) => {
						return [scan.baseUrl.value, scan.startDate];
					})
				)
			)
		);
	}

	private async scanArchives(
		archives: Url[],
		persist = false,
		fromLedger?: number,
		toLedger?: number,
		maxConcurrency?: number
	) {
		for (let i = 0; i < archives.length; i++) {
			await this.scanArchive(
				archives[i],
				persist,
				fromLedger,
				toLedger,
				maxConcurrency
			);
		}
	}

	private async scanArchive(
		archive: Url,
		persist = false,
		fromLedger?: number,
		toLedger?: number,
		maxConcurrency?: number
	) {
		if (!toLedger) {
			const toLedgerResult = await this.getLatestLedger(archive);
			if (toLedgerResult.isErr()) {
				this.exceptionLogger.captureException(
					mapUnknownToError(toLedgerResult.error)
				);
				return;
			}

			toLedger = toLedgerResult.value;
		}

		const scan = new HistoryArchiveScan(
			new Date(),
			fromLedger ? fromLedger : 0,
			toLedger,
			archive,
			maxConcurrency
		);

		if (!maxConcurrency) {
			const maxConcurrencyResult =
				await this.historyArchivePerformanceTester.determineOptimalConcurrency(
					scan.baseUrl,
					scan.toLedger,
					false
				);
			if (maxConcurrencyResult.isErr()) {
				this.exceptionLogger.captureException(
					mapUnknownToError(maxConcurrencyResult.error)
				);
				return;
			}

			if (maxConcurrencyResult.value.concurrency === Infinity) {
				scan.markError(
					scan.baseUrl,
					new Date(),
					'No concurrency option completed without errors'
				);
				if (persist) await this.persist(scan);
				return;
			}

			if (maxConcurrencyResult.value.timeMsPerFile > 100) {
				scan.markError(
					scan.baseUrl,
					new Date(),
					`History archive too slow, ${maxConcurrencyResult.value.timeMsPerFile} ms per HAS file download`
				);
				if (persist) await this.persist(scan);
				return;
			}

			scan.maxConcurrency = maxConcurrencyResult.value.concurrency;
		}

		const historyArchiveScanOrError = await this.historyArchiveScanner.perform(
			scan
		);

		if (historyArchiveScanOrError.isErr()) {
			this.exceptionLogger.captureException(historyArchiveScanOrError.error);
			return;
		}

		//todo: logger
		if (persist) await this.persist(historyArchiveScanOrError.value);
	}

	private async persist(historyArchiveScanOrError: HistoryArchiveScan) {
		try {
			await this.historyArchiveScanRepository.save([historyArchiveScanOrError]);
		} catch (e: unknown) {
			this.exceptionLogger.captureException(mapUnknownToError(e));
		}
	}

	private async getLatestLedger(url: Url): Promise<Result<number, Error>> {
		const latestLedgerOrError =
			await this.historyService.fetchStellarHistoryLedger(url.value);
		if (latestLedgerOrError.isErr()) {
			return err(latestLedgerOrError.error);
		}

		return ok(latestLedgerOrError.value);
	}
}
