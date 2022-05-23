import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { isNumber, isObject } from '../../../shared/utilities/TypeGuards';
import { inject, injectable } from 'inversify';
import { HttpService } from '../../../shared/services/HttpService';
import { Url } from '../../../shared/domain/Url';
import { CustomError } from '../../../shared/errors/CustomError';
import { Logger } from '../../../shared/services/PinoLogger';
import { HistoryArchiveScanService } from './HistoryArchiveScanService';
import { Node } from '@stellarbeat/js-stellar-domain';
import { TYPES } from '../../infrastructure/di/di-types';

export class FetchHistoryError extends CustomError {
	constructor(url: string, cause?: Error) {
		super('Failed fetching history at ' + url, FetchHistoryError.name, cause);
	}
}

@injectable()
export class HistoryService {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject(TYPES.HistoryArchiveScanService)
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

	async updateGaps(nodes: Node[]): Promise<Result<Node[], Error>> {
		const scanResult = await this.historyArchiveScanService.findLatestScans();
		if (scanResult.isErr()) return err(scanResult.error);
		const scansWithGaps = new Set(
			scanResult.value.filter((scan) => scan.hasGap).map((scan) => scan.url)
		);
		this.logger.info('History archive gaps', {
			urls: Array.from(scansWithGaps)
		});

		nodes.forEach((node) => {
			if (node.historyUrl !== null) {
				const urlResult = Url.create(node.historyUrl); //to make sure matching happens (trailing slashes etc), could use a cleaner solution
				if (urlResult.isErr())
					this.logger.info('Invalid history url', {
						url: node.historyUrl
					});
				else if (scansWithGaps.has(urlResult.value.value)) {
					node.historyArchiveGap = true;
				}
			}
		});

		return ok(nodes);
	}
}