import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { isNumber, isObject } from '../../../../../core/utilities/TypeGuards';
import { inject, injectable } from 'inversify';
import { HttpService } from '../../../../../core/services/HttpService';
import { Url } from '../../../../../core/domain/Url';
import { CustomError } from '../../../../../core/errors/CustomError';
import { Logger } from '../../../../../core/services/PinoLogger';
import { HistoryArchiveScanService } from './HistoryArchiveScanService';
import { NETWORK_TYPES } from '../../../../infrastructure/di/di-types';

export class FetchHistoryError extends CustomError {
	constructor(url: string, cause?: Error) {
		super('Failed fetching history at ' + url, FetchHistoryError.name, cause);
	}
}

@injectable()
export class HistoryService {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject(NETWORK_TYPES.HistoryArchiveScanService)
		protected historyArchiveScanService: HistoryArchiveScanService,
		@inject('Logger') protected logger: Logger
	) {}

	async fetchStellarHistoryLedger(
		historyUrl: string
	): Promise<Result<number, FetchHistoryError>> {
		historyUrl = historyUrl.replace(/\/$/, ''); //remove trailing slash
		const stellarHistoryUrl = historyUrl + '/.well-known/stellar-history.json';

		const urlResult = Url.create(stellarHistoryUrl);
		if (urlResult.isErr())
			return err(new FetchHistoryError(stellarHistoryUrl, urlResult.error));

		const response = await this.httpService.get(urlResult.value);
		if (response.isErr())
			return err(new FetchHistoryError(stellarHistoryUrl, response.error));

		if (!isObject(response.value.data))
			return err(
				new FetchHistoryError(
					stellarHistoryUrl,
					new Error('Invalid history response, no data property')
				)
			);

		const currentLedgerResult = this.extractLedger(response.value.data);

		if (currentLedgerResult.isErr()) {
			return err(
				new FetchHistoryError(stellarHistoryUrl, currentLedgerResult.error)
			);
		}

		return ok(currentLedgerResult.value);
	}

	protected extractLedger(
		stellarHistory: Record<string, unknown>
	): Result<number, Error> {
		if (isNumber(stellarHistory.currentLedger)) {
			return ok(stellarHistory.currentLedger);
		}

		return err(
			new Error('Ledger not a number: ' + stellarHistory.currentLedger)
		);
	}

	async stellarHistoryIsUpToDate(
		historyUrl: string,
		latestLedger: string
	): Promise<boolean> {
		const stellarHistoryResult = await this.fetchStellarHistoryLedger(
			historyUrl
		);

		if (stellarHistoryResult.isErr()) {
			this.logger.info(stellarHistoryResult.error.message);
			return false;
		}

		//todo: latestLedger sequence is bigint, but horizon returns number type for ledger sequence
		return stellarHistoryResult.value + 100 >= Number(latestLedger); //allow for a margin of 100 ledgers to account for delay in archiving
	}

	async getHistoryUrlsWithScanErrors(
		historyUrls: string[]
	): Promise<Result<Set<string>, Error>> {
		const scanResult = await this.historyArchiveScanService.findLatestScans();
		if (scanResult.isErr()) return err(scanResult.error);
		const scansWithErrors = new Set(
			scanResult.value.filter((scan) => scan.hasError).map((scan) => scan.url)
		);
		this.logger.info('History archive errors', {
			urls: Array.from(scansWithErrors)
		});

		const historyUrlsWithErrors = new Set<string>();

		historyUrls.forEach((historyUrl) => {
			const urlResult = Url.create(historyUrl); //to make sure matching happens (trailing slashes etc), could use a cleaner solution
			if (urlResult.isErr())
				this.logger.info('Invalid history url', {
					url: historyUrl
				});
			else if (scansWithErrors.has(urlResult.value.value)) {
				historyUrlsWithErrors.add(historyUrl);
			}
		});

		return ok(historyUrlsWithErrors);
	}
}
