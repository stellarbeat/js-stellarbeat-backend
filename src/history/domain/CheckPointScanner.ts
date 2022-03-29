import { Logger } from '../../shared/services/PinoLogger';
import { CheckPointScan, ScanStatus } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { Result } from 'neverthrow';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import { FetchError, UrlFetcher } from './UrlFetcher';

export interface HistoryArchiveState {
	version: number;
	server: string;
	currentLedger: number;
	networkPassphrase?: string;
	currentBuckets: {
		curr: string;
		snap: string;
		next: {
			state: number;
			output?: string;
		};
	}[];
}

const HistoryArchiveStateSchema: JSONSchemaType<HistoryArchiveState> = {
	type: 'object',
	properties: {
		version: { type: 'integer' },
		server: { type: 'string' },
		currentLedger: { type: 'number' },
		networkPassphrase: { type: 'string', nullable: true },
		currentBuckets: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					curr: { type: 'string' },
					snap: { type: 'string' },
					next: {
						type: 'object',
						properties: {
							state: { type: 'number' },
							output: { type: 'string', nullable: true }
						},
						required: ['state']
					}
				},
				required: ['curr', 'snap', 'next']
			},
			minItems: 0
		}
	},
	required: ['version', 'server', 'currentLedger', 'currentBuckets']
};

@injectable()
export class CheckPointScanner {
	private readonly validateHistoryArchiveState: ValidateFunction<HistoryArchiveState>;

	constructor(
		protected urlFetcher: UrlFetcher,
		@inject('Logger') protected logger: Logger
	) {
		const ajv = new Ajv();
		this.validateHistoryArchiveState = ajv.compile(HistoryArchiveStateSchema); //todo this probably needs to move higher up the chain...
	}

	get existsTimings() {
		return this.urlFetcher.existTimings;
	}

	get fetchTimings() {
		return this.urlFetcher.fetchTimings;
	}

	async scan(checkPointScan: CheckPointScan, bucketsCache: Set<string>) {
		checkPointScan.newAttempt();

		const historyStateFile = await this.scanAndGetHistoryStateFile(
			checkPointScan
		);
		if (historyStateFile) {
			/*await this.scanBuckets(
				historyStateFile,
				checkPointScan,
				bucketsCache
			);*/
		}

		await this.scanLedgerCategory(checkPointScan);
		await this.scanTransactionsCategory(checkPointScan);
		await this.scanResultsCategory(checkPointScan);
	}

	private async scanBuckets(
		historyArchiveState: HistoryArchiveState,
		checkPointScan: CheckPointScan,
		bucketsCache: Set<string>
	) {
		this.logger.debug('Scanning buckets', {
			cp: checkPointScan.checkPoint.ledger,
			nr: historyArchiveState.currentBuckets.length
		});
		//we use for loop because we want to run one http query at a time. the parallelism is achieved by processing multiple checkpoints at the same time

		for (
			let index = 0;
			index < historyArchiveState.currentBuckets.length;
			index++
		) {
			await this.scanBucket(
				historyArchiveState.currentBuckets[index].curr,
				checkPointScan,
				bucketsCache
			);

			await this.scanBucket(
				historyArchiveState.currentBuckets[index].snap,
				checkPointScan,
				bucketsCache
			);

			const nextOutput = historyArchiveState.currentBuckets[index].next.output;
			if (nextOutput)
				await this.scanBucket(nextOutput, checkPointScan, bucketsCache);

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
		presentBucketsCache: Set<string>
	) {
		if (parseInt(hash, 16) === 0) return;

		if (presentBucketsCache.has(hash)) {
			checkPointScan.bucketsScanStatus = ScanStatus.present;
			return;
		}

		const exists = await this.urlFetcher.exists(
			checkPointScan.checkPoint.getBucketUrl(hash)
		);

		checkPointScan.bucketsScanStatus = this.determineScanStatusFromExistsResult(
			exists,
			checkPointScan
		);

		if (checkPointScan.bucketsScanStatus === ScanStatus.present) {
			presentBucketsCache.add(hash);
		}
	}

	private determineScanStatusFromExistsResult(
		result: Result<boolean, FetchError>,
		checkPointScan: CheckPointScan
	) {
		if (result.isOk()) {
			if (result.value) {
				return ScanStatus.present;
			} else return ScanStatus.missing;
		} else {
			this.logger.info(result.error.message, {
				code: result.error.responseStatus,
				url: checkPointScan.checkPoint.historyCategoryUrl.value,
				cp: checkPointScan.checkPoint.ledger
			});
			return ScanStatus.error;
		}
	}

	private async scanResultsCategory(checkPointScan: CheckPointScan) {
		this.logger.debug('Scan results');
		const result = await this.urlFetcher.exists(
			checkPointScan.checkPoint.resultsCategoryUrl
		);

		checkPointScan.resultsCategoryScanStatus =
			this.determineScanStatusFromExistsResult(result, checkPointScan);
	}

	private async scanTransactionsCategory(checkPointScan: CheckPointScan) {
		const result = await this.urlFetcher.exists(
			checkPointScan.checkPoint.transactionsCategoryUrl
		);

		checkPointScan.transactionsCategoryScanStatus =
			this.determineScanStatusFromExistsResult(result, checkPointScan);
	}

	private async scanLedgerCategory(checkPointScan: CheckPointScan) {
		const result = await this.urlFetcher.exists(
			checkPointScan.checkPoint.ledgersCategoryUrl
		);

		checkPointScan.ledgerCategoryScanStatus =
			this.determineScanStatusFromExistsResult(result, checkPointScan);
	}

	private async scanAndGetHistoryStateFile(
		checkPointScan: CheckPointScan
	): Promise<HistoryArchiveState | undefined> {
		this.logger.debug('Scanning url', {
			url: checkPointScan.checkPoint.historyCategoryUrl.value,
			cp: checkPointScan.checkPoint.ledger
		});

		const historyArchiveStateResultOrError = await this.urlFetcher.fetchJSON(
			checkPointScan.checkPoint.historyCategoryUrl
		);

		if (historyArchiveStateResultOrError.isErr()) {
			this.logger.info('Scan error', {
				code: historyArchiveStateResultOrError.error.responseStatus,
				message: historyArchiveStateResultOrError.error.message,
				url: checkPointScan.checkPoint.historyCategoryUrl.value,
				cp: checkPointScan.checkPoint.ledger
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.error;
			return undefined;
		}

		if (historyArchiveStateResultOrError.value === undefined) {
			this.logger.debug('HAS missing', {
				cp: checkPointScan.checkPoint.ledger
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.missing;
			return undefined;
		}

		const historyArchiveState = historyArchiveStateResultOrError.value;
		const validate = this.validateHistoryArchiveState;
		if (validate(historyArchiveState)) {
			checkPointScan.historyCategoryScanStatus = ScanStatus.present;
			return historyArchiveState;
		} else {
			this.logger.info('HAS file invalid', {
				cp: checkPointScan.checkPoint.ledger,
				url: checkPointScan.checkPoint.historyCategoryUrl.value
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.error;
			const errors = validate.errors;
			if (errors !== undefined && errors !== null) return undefined;
			else return undefined;
		} //todo logging or new type of error, could be moved up to url fetcher
	}
}
