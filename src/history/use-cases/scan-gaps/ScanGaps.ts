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
import { TYPES } from '../../../shared/core/di-types';
import { HistoryArchiveScan } from '../../domain/history-archive-scan/HistoryArchiveScan';
import { HistoryService } from '../../../network-update/domain/HistoryService';

@injectable()
export class ScanGaps {
	constructor(
		private historyService: HistoryService,
		private historyArchiveScanner: HistoryArchiveScanner,
		@inject('HistoryArchiveScanRepository')
		private historyArchiveScanRepository: HistoryArchiveScanRepository,
		@inject(TYPES.NetworkReadRepository)
		private networkRepository: NetworkReadRepository,
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

		const historyUrls = network.nodes
			.filter((node) => isString(node.historyUrl))
			.map((node) => {
				const historyUrlOrError = Url.create(node.historyUrl as string);
				if (historyUrlOrError.isErr()) {
					this.exceptionLogger.captureException(historyUrlOrError.error);
					return undefined;
				}
				return historyUrlOrError.value;
			})
			.filter((historyUrl) => historyUrl instanceof Url) as Url[];

		return ok(historyUrls);
	}

	private async scanArchives(
		archives: Url[],
		persist = false,
		fromLedger?: number,
		toLedger?: number
	) {
		for (let i = 0; i < archives.length; i++) {
			if (!toLedger) {
				const toLedgerResult = await this.getLatestLedger(archives[i]);
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
				archives[i]
			);

			const historyArchiveScanOrError =
				await this.historyArchiveScanner.perform(scan);

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

	private async getLatestLedger(url: Url): Promise<Result<number, Error>> {
		const latestLedgerOrError =
			await this.historyService.fetchStellarHistoryLedger(url.value);
		if (latestLedgerOrError.isErr()) {
			return err(latestLedgerOrError.error);
		}

		return ok(latestLedgerOrError.value);
	}
}
