import { HttpService } from '../../shared/services/HttpService';
import { Url } from '../../shared/domain/Url';
import { Logger } from '../../shared/services/PinoLogger';
import { CheckPointScan, ScanStatus } from './CheckPointScan';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

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
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') protected logger: Logger
	) {
		const ajv = new Ajv();
		this.validateHistoryArchiveState = ajv.compile(HistoryArchiveStateSchema); //todo this probably needs to move higher up the chain...
	}

	async scan(checkPointScan: CheckPointScan) {
		checkPointScan.newAttempt();
		if (
			checkPointScan.attempt > 1 ||
			((checkPointScan.checkPoint.ledger + 1) / 64) % 100 === 0
		) {
			console.timeEnd('scan');
			console.time('scan');
			this.logger.info('Scanning checkpoint', {
				ledger: checkPointScan.checkPoint.ledger,
				attempt: checkPointScan.attempt
			});
		}
		const historyStateFileOrError = await this.scanAndGetHistoryStateFile(
			checkPointScan
		);
		if (!historyStateFileOrError.isErr()) {
			await this.scanBuckets(historyStateFileOrError.value, checkPointScan);
		}

		await this.scanLedgerCategory(checkPointScan);
		await this.scanTransactionsCategory(checkPointScan);
		await this.scanResultsCategory(checkPointScan);
	}

	private async scanBuckets(
		historyArchiveState: HistoryArchiveState,
		checkPointScan: CheckPointScan
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
				checkPointScan
			);

			await this.scanBucket(
				historyArchiveState.currentBuckets[index].snap,
				checkPointScan
			);

			const nextOutput = historyArchiveState.currentBuckets[index].next.output;
			if (nextOutput) await this.scanBucket(nextOutput, checkPointScan);

			if (
				// @ts-ignore
				checkPointScan.bucketsScanStatus === ScanStatus.missing ||
				// @ts-ignore
				checkPointScan.bucketsScanStatus === ScanStatus.error
			)
				break;
		}
	}

	private async scanBucket(hash: string, checkPointScan: CheckPointScan) {
		if (parseInt(hash, 16) === 0) return;

		//todo: cache scan results
		checkPointScan.bucketsScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.getBucketUrl(hash),
			checkPointScan
		);
	}

	private async scanResultsCategory(checkPointScan: CheckPointScan) {
		this.logger.debug('Scan results');
		checkPointScan.resultsCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.resultsCategoryUrl,
			checkPointScan
		);
	}

	private async scanTransactionsCategory(checkPointScan: CheckPointScan) {
		checkPointScan.transactionsCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.transactionsCategoryUrl,
			checkPointScan
		);
	}

	private async scanLedgerCategory(checkPointScan: CheckPointScan) {
		checkPointScan.ledgerCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.ledgersCategoryUrl,
			checkPointScan
		);
	}

	private async scanAndGetHistoryStateFile(
		checkPointScan: CheckPointScan
	): Promise<Result<HistoryArchiveState, Error>> {
		this.logger.debug('Scanning url', {
			url: checkPointScan.checkPoint.historyCategoryUrl.value,
			cp: checkPointScan.checkPoint.ledger
		});

		const historyArchiveStateResultOrError = await this.httpService.get(
			checkPointScan.checkPoint.historyCategoryUrl,
			undefined,
			'json',
			10000
		);

		if (historyArchiveStateResultOrError.isErr()) {
			this.logger.error('Scan error', {
				code: historyArchiveStateResultOrError.error.code,
				message: historyArchiveStateResultOrError.error.message,
				url: checkPointScan.checkPoint.historyCategoryUrl.value,
				cp: checkPointScan.checkPoint.ledger
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.error;
			return err(historyArchiveStateResultOrError.error);
		}

		if (historyArchiveStateResultOrError.value.status !== 200) {
			this.logger.info('Non 200 result', {
				status: historyArchiveStateResultOrError.value.status,
				message: historyArchiveStateResultOrError.value.statusText,
				cp: checkPointScan.checkPoint.ledger
			});
			checkPointScan.historyCategoryScanStatus = ScanStatus.missing;
			return err(new Error('HAS missing'));
		}

		const historyArchiveState = historyArchiveStateResultOrError.value.data;
		const validate = this.validateHistoryArchiveState;
		if (validate(historyArchiveState)) {
			checkPointScan.historyCategoryScanStatus = ScanStatus.present;
			return ok(historyArchiveState);
		} else {
			checkPointScan.historyCategoryScanStatus = ScanStatus.error;
			const errors = validate.errors;
			if (errors !== undefined && errors !== null)
				return err(new Error(errors.toString()));
			else return err(new Error('Error validating HAS'));
		}
	}

	private async scanUrl(
		url: Url,
		checkPointScan: CheckPointScan
	): Promise<ScanStatus> {
		this.logger.debug('Scanning url', {
			url: url.value,
			cp: checkPointScan.checkPoint.ledger
		});
		const resultOrError = await this.httpService.head(url, 10000);
		if (resultOrError.isErr()) {
			this.logger.error('Scan error', {
				code: resultOrError.error.code,
				message: resultOrError.error.message,
				url: url.value,
				cp: checkPointScan.checkPoint.ledger
			});
			return ScanStatus.error;
		} else {
			const result = resultOrError.value;
			if (result.status === 200) return ScanStatus.present;
			else {
				this.logger.info('Non 200 result', {
					status: result.status,
					message: result.statusText,
					cp: checkPointScan.checkPoint.ledger
				});
				return ScanStatus.missing;
			}
		}
	}
}
