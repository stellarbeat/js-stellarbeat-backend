/*
import { Logger } from '../../shared/services/PinoLogger';
import { CheckPointScan, ScanStatus } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { Result } from 'neverthrow';
import { FetchError, UrlFetcher } from './UrlFetcher';
import { HASValidator } from './HASValidator';
import { Url } from '../../shared/domain/Url';
import { UrlBuilder } from './UrlBuilder';
import { BucketScanner } from './BucketScanner';
import { HASBucketHashExtractor } from './HASBucketHashExtractor';

@injectable()
export class CheckPointScanner {
	constructor(
		protected urlFetcher: UrlFetcher,
		protected historyArchiveStateFetcher: HASValidator,
		protected bucketScanner: BucketScanner,
		@inject('Logger') protected logger: Logger
	) {}

	get existsTimings() {
		return this.urlFetcher.existTimings;
	}

	async scan(
		checkPointScan: CheckPointScan,
		existingBuckets: Map<string, boolean>
	) {
		checkPointScan.newAttempt();

		await this.setHistoryStateFile(checkPointScan);
		if (checkPointScan.historyArchiveState) {
			await this.bucketScanner.scanBuckets(
				HASBucketHashExtractor.getHashes(checkPointScan.historyArchiveState),
				checkPointScan.historyArchiveBaseUrl,
				existingBuckets
			);
		}
		await this.scanLedgerCategory(checkPointScan);
		await this.scanTransactionsCategory(checkPointScan);
		await this.scanResultsCategory(checkPointScan);
	}

	private determineScanStatusFromExistsResult(
		result: Result<boolean, FetchError>,
		url: Url,
		ledger: number
	) {
		if (result.isOk()) {
			if (result.value) {
				return ScanStatus.present;
			} else return ScanStatus.missing;
		} else {
			this.logger.info(result.error.message, {
				responseStatus: result.error.cause.response?.status,
				url: url,
				ledger: ledger
			});
			return ScanStatus.error;
		}
	}

	private async scanResultsCategory(checkPointScan: CheckPointScan) {
		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.checkPoint,
			'results'
		);

		const result = await this.urlFetcher.exists(url);

		checkPointScan.resultsCategoryScanStatus =
			this.determineScanStatusFromExistsResult(
				result,
				url,
				checkPointScan.checkPoint
			);
	}

	private async scanTransactionsCategory(checkPointScan: CheckPointScan) {
		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.checkPoint,
			'transactions'
		);
		const result = await this.urlFetcher.exists(url);

		checkPointScan.transactionsCategoryScanStatus =
			this.determineScanStatusFromExistsResult(
				result,
				url,
				checkPointScan.checkPoint
			);
	}

	private async scanLedgerCategory(checkPointScan: CheckPointScan) {
		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.checkPoint,
			'ledger'
		);
		const result = await this.urlFetcher.exists(url);

		checkPointScan.ledgerCategoryScanStatus =
			this.determineScanStatusFromExistsResult(
				result,
				url,
				checkPointScan.checkPoint
			);
	}

	private async setHistoryStateFile(
			checkPointScan: CheckPointScan
	): Promise<void> {
			if (checkPointScan.historyArchiveState) return; //already found in previous attempt

		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.checkPoint,
			'history'
		);

		this.logger.debug('Scanning url', {
			url: url.value,
			cp: checkPointScan.checkPoint
		});

		const historyArchiveStateResultOrError =
			await this.historyArchiveStateFetcher.fetchHASFile(url);

		if (historyArchiveStateResultOrError.isErr()) {
			this.logger.info('Error fetching HAS file', {
				message: historyArchiveStateResultOrError.error.message,
				url: url.value,
				cp: checkPointScan.checkPoint
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.error;
			return;
		}

		if (historyArchiveStateResultOrError.value === undefined) {
			this.logger.debug('HAS missing', {
				cp: checkPointScan.checkPoint
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.missing;
			return;
		}

		checkPointScan.historyCategoryScanStatus = ScanStatus.present;
		checkPointScan.historyArchiveState = historyArchiveStateResultOrError.value;
	}
}*/
