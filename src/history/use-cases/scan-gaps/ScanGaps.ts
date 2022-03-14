import { ScanGapsDTO } from './ScanGapsDTO';
import { HistoryArchive } from '../../domain/HistoryArchive';
import { Url } from '../../../shared/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { inject, injectable } from 'inversify';
import { HistoryArchiveScanRepository } from '../../domain/HistoryArchiveScanRepository';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { isString } from '../../../shared/utilities/TypeGuards';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { TYPES } from '../../../shared/core/di-types';

@injectable()
export class ScanGaps {
	constructor(
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
