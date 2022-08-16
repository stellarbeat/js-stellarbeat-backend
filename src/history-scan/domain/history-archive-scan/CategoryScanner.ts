import { err, ok, Result } from 'neverthrow';
import {
	CategoryRequestMeta,
	HASRequestMeta,
	RequestGenerator
} from './RequestGenerator';
import {
	FileNotFoundError,
	HttpQueue,
	QueueError,
	Request,
	RequestMethod
} from '../HttpQueue';
import { HASValidator } from '../history-archive/HASValidator';
import { injectable } from 'inversify';
import { Url } from '../../../shared/domain/Url';
import { ScanError } from './HistoryArchiveScanner';
import { GapFoundError } from './GapFoundError';
import { HASBucketHashExtractor } from '../history-archive/HASBucketHashExtractor';
import * as http from 'http';
import * as https from 'https';
import { mapHttpQueueErrorToScanError } from './mapHttpQueueErrorToScanError';
import { isObject } from '../../../shared/utilities/TypeGuards';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { WorkerPool } from 'workerpool';
import * as workerpool from 'workerpool';
import { Category } from '../history-archive/Category';

type Ledger = number;
type Hash = string;

@injectable()
export class CategoryScanner {
	private pool: WorkerPool;

	constructor(
		private hasValidator: HASValidator,
		private httpQueue: HttpQueue
	) {
		try {
			require(__dirname + '/hash-worker.import.js');
			this.pool = workerpool.pool(__dirname + '/hash-worker.import.js');
		} catch (e) {
			this.pool = workerpool.pool(__dirname + '/hash-worker.js');
		}
	}

	//fetches all HAS files in checkpoint range and returns all detected bucket urls
	public async scanHASFilesAndReturnBucketHashes(
		historyBaseUrl: Url,
		checkPoints: IterableIterator<number>,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<Set<string>, GapFoundError | ScanError>> {
		const historyArchiveStateURLGenerator =
			RequestGenerator.generateHASRequests(
				historyBaseUrl,
				checkPoints,
				RequestMethod.GET
			);

		const bucketHashes = new Set<string>();
		const successOrError = await this.httpQueue.sendRequests(
			historyArchiveStateURLGenerator,
			{
				stallTimeMs: 150,
				concurrency: concurrency,
				nrOfRetries: 5,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'json',
					timeoutMs: 10000
				}
			},
			async (result: unknown, request) => {
				if (!isObject(result)) {
					return new FileNotFoundError(request);
				}
				const validateHASResult = this.hasValidator.validate(result);
				if (validateHASResult.isOk()) {
					HASBucketHashExtractor.getNonZeroHashes(
						validateHASResult.value
					).forEach((hash) => bucketHashes.add(hash));
				} else {
					return new QueueError<HASRequestMeta>(
						request,
						validateHASResult.error
					);
				}
			}
		);

		if (successOrError.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(
					successOrError.error,
					successOrError.error.request.meta.checkPoint
				)
			);
		}

		return ok(bucketHashes);
	}

	async scanOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		verify = false
	): Promise<Result<void, GapFoundError | ScanError>> {
		if (!verify)
			return await this.otherCategoriesExist(
				baseUrl,
				concurrency,
				checkPoints,
				httpAgent,
				httpsAgent
			);

		return await this.verifyOtherCategories(
			baseUrl,
			concurrency,
			checkPoints,
			httpAgent,
			httpsAgent
		);
	}

	private async verifyOtherCategories(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		const transactionsMap: Map<Ledger, Hash> = new Map();
		const ledgersMap: Map<
			Ledger,
			{ transactionsHash: string; transactionResultsHash: string }
		> = new Map();
		const transactionResultsMap: Map<Ledger, Hash> = new Map();
		const verify = async (
			result: unknown,
			request: Request<CategoryRequestMeta>
		): Promise<QueueError<CategoryRequestMeta> | undefined> => {
			if (!(result instanceof Buffer)) return new FileNotFoundError(request);
			try {
				switch (request.meta.category) {
					case Category.results:
						(
							await this.performInPool<Map<Ledger, string>>(
								result,
								'unzipAndHashTransactionResultEntries'
							)
						).forEach((hash, ledger) =>
							transactionResultsMap.set(ledger, hash)
						);
						break;
					case Category.transactions:
						(
							await this.performInPool<Map<Ledger, string>>(
								result,
								'unzipAndHashTransactionEntries'
							)
						).forEach((hash, ledger) => transactionsMap.set(ledger, hash));
						break;
					case Category.ledger:
						(
							await this.performInPool<
								Map<
									Ledger,
									{ transactionsHash: string; transactionResultsHash: string }
								>
							>(result, 'unzipLedgerHeaderHistoryEntries')
						).forEach((result, ledger) => ledgersMap.set(ledger, result));
						break;
					default:
						break;
				}
			} catch (e) {
				return new QueueError<CategoryRequestMeta>(
					request,
					mapUnknownToError(e)
				);
			}
		};

		const verifyResult = await this.httpQueue.sendRequests<CategoryRequestMeta>(
			RequestGenerator.generateCategoryRequests(
				checkPoints,
				baseUrl,
				RequestMethod.GET
			),
			{
				stallTimeMs: 150,
				concurrency: concurrency,
				nrOfRetries: 5,
				rampUpConnections: true,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'arraybuffer',
					timeoutMs: 10000
				}
			},
			verify
		);

		if (verifyResult.isErr()) {
			return err(mapHttpQueueErrorToScanError(verifyResult.error, undefined));
		}

		console.log(transactionResultsMap);
		console.log(transactionsMap);
		console.log(ledgersMap);

		return ok(undefined);
	}

	private async otherCategoriesExist(
		baseUrl: Url,
		concurrency: number,
		checkPoints: IterableIterator<number>,
		httpAgent: http.Agent,
		httpsAgent: https.Agent
	): Promise<Result<void, GapFoundError | ScanError>> {
		const generateCategoryQueueUrls = RequestGenerator.generateCategoryRequests(
			checkPoints,
			baseUrl,
			RequestMethod.HEAD
		);

		const categoriesExistResult =
			await this.httpQueue.sendRequests<CategoryRequestMeta>(
				generateCategoryQueueUrls,
				{
					stallTimeMs: 150,
					concurrency: concurrency,
					nrOfRetries: 5,
					rampUpConnections: true,
					httpOptions: {
						responseType: undefined,
						timeoutMs: 10000,
						httpAgent: httpAgent,
						httpsAgent: httpsAgent
					}
				}
			);

		if (categoriesExistResult.isErr()) {
			return err(
				mapHttpQueueErrorToScanError(
					categoriesExistResult.error,
					categoriesExistResult.error.request.meta.checkPoint
				)
			);
		}

		return ok(undefined);
	}

	private async performInPool<Return>(
		data: Buffer,
		method:
			| 'unzipAndHashTransactionResultEntries'
			| 'unzipAndHashTransactionEntries'
			| 'unzipLedgerHeaderHistoryEntries'
	): Promise<Return> {
		return new Promise((resolve, reject) => {
			this.pool
				.exec(method, [data])
				.then(function (map) {
					resolve(map);
				})
				.catch(function (err) {
					reject(err);
				});
		});
	}
}
