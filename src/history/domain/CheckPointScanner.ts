import { Logger } from '../../shared/services/PinoLogger';
import { CheckPointScan, ScanStatus } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { Result } from 'neverthrow';
import { FetchError, UrlFetcher } from './UrlFetcher';
import { HASFetcher } from './HASFetcher';
import { Url } from '../../shared/domain/Url';
import { UrlBuilder } from './UrlBuilder';

@injectable()
export class CheckPointScanner {
	constructor(
		protected urlFetcher: UrlFetcher,
		protected historyArchiveStateFetcher: HASFetcher,
		@inject('Logger') protected logger: Logger
	) {}

	get existsTimings() {
		return this.urlFetcher.existTimings;
	}

	async scan(checkPointScan: CheckPointScan, existingBuckets: Set<string>) {
		checkPointScan.newAttempt();

		await this.setHistoryStateFile(checkPointScan);
		await this.scanBuckets(checkPointScan, existingBuckets);
		await this.scanLedgerCategory(checkPointScan);
		await this.scanTransactionsCategory(checkPointScan);
		await this.scanResultsCategory(checkPointScan);
	}

	private async scanBuckets(
		checkPointScan: CheckPointScan,
		existingBuckets: Set<string>
	) {
		if (!checkPointScan.historyArchiveState) return;

		this.logger.debug('Scanning buckets', {
			cp: checkPointScan.ledger,
			nr: checkPointScan.historyArchiveState.currentBuckets.length
		});
		//we use for loop because we want to run one http query at a time. the parallelism is achieved by processing multiple checkpoints at the same time

		for (
			let index = 0;
			index < checkPointScan.historyArchiveState.currentBuckets.length;
			index++
		) {
			await this.scanBucket(
				checkPointScan.historyArchiveState.currentBuckets[index].curr,
				checkPointScan,
				existingBuckets
			);

			await this.scanBucket(
				checkPointScan.historyArchiveState.currentBuckets[index].snap,
				checkPointScan,
				existingBuckets
			);

			const nextOutput =
				checkPointScan.historyArchiveState.currentBuckets[index].next.output;
			if (nextOutput)
				await this.scanBucket(nextOutput, checkPointScan, existingBuckets);

			if (
				// @ts-ignore
				checkPointScan.bucketsScanStatus === ScanStatus.missing ||
				// @ts-ignore
				checkPointScan.bucketsScanStatus === ScanStatus.error
			)
				break;
		}
	}

	private async scanBucket(
		hash: string,
		checkPointScan: CheckPointScan,
		existingBuckets: Set<string>
	) {
		if (parseInt(hash, 16) === 0) return;

		if (existingBuckets.has(hash)) {
			checkPointScan.bucketsScanStatus = ScanStatus.present;
			return;
		}

		const url = UrlBuilder.getBucketUrl(
			checkPointScan.historyArchiveBaseUrl,
			hash
		);

		const exists = await this.urlFetcher.exists(url);

		checkPointScan.bucketsScanStatus = this.determineScanStatusFromExistsResult(
			exists,
			url,
			checkPointScan.ledger
		);

		if (checkPointScan.bucketsScanStatus === ScanStatus.present) {
			existingBuckets.add(hash);
		}
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
			checkPointScan.ledger,
			'results'
		);

		const result = await this.urlFetcher.exists(url);

		checkPointScan.resultsCategoryScanStatus =
			this.determineScanStatusFromExistsResult(
				result,
				url,
				checkPointScan.ledger
			);
	}

	private async scanTransactionsCategory(checkPointScan: CheckPointScan) {
		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.ledger,
			'transactions'
		);
		const result = await this.urlFetcher.exists(url);

		checkPointScan.transactionsCategoryScanStatus =
			this.determineScanStatusFromExistsResult(
				result,
				url,
				checkPointScan.ledger
			);
	}

	private async scanLedgerCategory(checkPointScan: CheckPointScan) {
		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.ledger,
			'ledger'
		);
		const result = await this.urlFetcher.exists(url);

		checkPointScan.ledgerCategoryScanStatus =
			this.determineScanStatusFromExistsResult(
				result,
				url,
				checkPointScan.ledger
			);
	}

	private async setHistoryStateFile(
		checkPointScan: CheckPointScan
	): Promise<void> {
		if (checkPointScan.historyArchiveState) return;

		const url = UrlBuilder.getCategoryUrl(
			checkPointScan.historyArchiveBaseUrl,
			checkPointScan.ledger,
			'history'
		);

		this.logger.debug('Scanning url', {
			url: url.value,
			cp: checkPointScan.ledger
		});

		const historyArchiveStateResultOrError =
			await this.historyArchiveStateFetcher.fetchHASFile(url);

		if (historyArchiveStateResultOrError.isErr()) {
			this.logger.info('Error fetching HAS file', {
				message: historyArchiveStateResultOrError.error.message,
				url: url.value,
				cp: checkPointScan.ledger
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.error;
			return;
		}

		if (historyArchiveStateResultOrError.value === undefined) {
			this.logger.debug('HAS missing', {
				cp: checkPointScan.ledger
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.missing;
			return;
		}

		checkPointScan.historyCategoryScanStatus = ScanStatus.present;
		checkPointScan.historyArchiveState = historyArchiveStateResultOrError.value;
	}
}
