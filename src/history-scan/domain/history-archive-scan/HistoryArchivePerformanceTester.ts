import { Url } from '../../../shared/domain/Url';
import {
	CategoryRequestMeta,
	HASRequestMeta,
	RequestGenerator
} from './RequestGenerator';
import { HttpQueue, Request, RequestMethod } from '../HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { injectable } from 'inversify';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { err, ok, Result } from 'neverthrow';
import { Category } from '../history-archive/Category';

export interface OptimalConcurrency {
	concurrency: number;
	timeMsPerFile: number;
}

@injectable()
export class HistoryArchivePerformanceTester {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private httpQueue: HttpQueue
	) {}

	async determineOptimalConcurrency(
		baseUrl: Url,
		highestLedger: number,
		largeFiles: boolean,
		concurrencyRange = [300, 200, 150, 100, 75, 50, 35, 25, 20, 15, 10],
		nrOfCheckPoints = 10000
	): Promise<Result<OptimalConcurrency, Error>> {
		if (
			HistoryArchivePerformanceTester.notEnoughCheckPointsInArchive(
				highestLedger,
				nrOfCheckPoints
			)
		)
			return err(new Error('Not enough checkpoints in archive'));

		this.httpQueue.cacheBusting = true;
		const concurrencyRangeSorted = concurrencyRange.sort((a, b) => b - a);
		let concurrencyRangeIndex = 0;
		const concurrencyTimings: number[] = [];
		let consecutiveIncreasingCount = 0; //we will stop after three consecutive increasing timings.
		let previousDuration = Infinity;

		while (
			concurrencyRangeIndex < concurrencyRangeSorted.length &&
			consecutiveIncreasingCount < 3
		) {
			console.log('concurrency', concurrencyRangeSorted[concurrencyRangeIndex]);
			const { httpAgent, httpsAgent } =
				HistoryArchivePerformanceTester.createHttpAgents(
					concurrencyRangeSorted[concurrencyRangeIndex]
				);

			console.log('opening sockets');
			//first open the sockets to have consistent test results (opening sockets can take longer than request on opened socket)
			await this.testDownload(
				baseUrl,
				highestLedger,
				concurrencyRangeSorted[concurrencyRangeIndex],
				concurrencyRangeSorted[concurrencyRangeIndex],
				//we need to warmup concurrency amount of connections because there is one HAS file per checkpoint
				httpAgent,
				httpsAgent,
				true,
				false
			);

			const duration = await this.measureFilesTest(
				baseUrl,
				highestLedger,
				nrOfCheckPoints,
				concurrencyRangeSorted[concurrencyRangeIndex],
				httpAgent,
				httpsAgent,
				largeFiles
			);
			concurrencyTimings.push(duration);
			if (previousDuration < duration) consecutiveIncreasingCount++;
			else consecutiveIncreasingCount = 0;

			previousDuration = duration;

			concurrencyRangeIndex++;
			httpAgent.destroy();
			httpsAgent.destroy();
			await asyncSleep(3000);
		}

		const fastestTime = Math.min(...concurrencyTimings);
		if (fastestTime === Infinity)
			return ok({
				concurrency: Infinity,
				timeMsPerFile: Infinity
			});

		const optimalConcurrency =
			concurrencyRangeSorted[concurrencyTimings.indexOf(fastestTime)];
		console.log('Optimal concurrency', optimalConcurrency);
		this.httpQueue.cacheBusting = false;

		return ok({
			concurrency: optimalConcurrency,
			timeMsPerFile: concurrencyTimings.indexOf(fastestTime) / nrOfCheckPoints
		});
	}

	private async measureFilesTest(
		baseUrl: Url,
		highestLedger: number,
		nrOfCheckPoints: number,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		largeFiles: boolean
	): Promise<number> {
		console.log('benchmarking');
		const start = new Date().getTime();
		const result = await this.testDownload(
			baseUrl,
			highestLedger,
			nrOfCheckPoints,
			concurrency,
			httpAgent,
			httpsAgent,
			false,
			largeFiles
		);
		if (result.isErr()) {
			console.log(result.error.message);
			return Infinity;
		} else {
			const stop = new Date().getTime();
			const duration = Math.round(10 * (stop - start)) / 10;

			console.log(
				`Concurrency: ${concurrency}, time Taken to execute: ${duration} ms`
			);
			return duration;
		}
	}

	private static createHttpAgents(concurrency: number) {
		const httpAgent = new http.Agent({
			keepAlive: true,
			maxSockets: concurrency,
			maxFreeSockets: concurrency,
			scheduling: 'fifo'
		});
		const httpsAgent = new https.Agent({
			keepAlive: true,
			maxSockets: concurrency,
			maxFreeSockets: concurrency,
			scheduling: 'fifo'
		});
		return { httpAgent, httpsAgent };
	}

	private static notEnoughCheckPointsInArchive(
		highestLedger: number,
		nrOfCheckPoints: number
	) {
		return highestLedger - 64 * nrOfCheckPoints < 0;
	}

	private async testDownload(
		baseUrl: Url,
		highestLedger: number,
		nrOfCheckPoints: number,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		warmup: boolean,
		largeFiles: boolean
	) {
		const checkPoints = this.checkPointGenerator.generate(
			highestLedger - 64 * nrOfCheckPoints,
			highestLedger
		);

		let requests: IterableIterator<
			Request<CategoryRequestMeta | HASRequestMeta>
		>;
		if (!largeFiles)
			requests = RequestGenerator.generateHASRequests(
				baseUrl,
				checkPoints,
				RequestMethod.GET
			);
		else
			requests = RequestGenerator.generateCategoryRequests(
				checkPoints,
				baseUrl,
				RequestMethod.GET,
				[Category.transactions]
			);

		const successOrError = await this.httpQueue.sendRequests(requests, {
			stallTimeMs: 150,
			concurrency: concurrency,
			nrOfRetries: 1,
			rampUpConnections: warmup,
			httpOptions: {
				httpAgent: httpAgent,
				httpsAgent: httpsAgent,
				responseType: 'json',
				timeoutMs: largeFiles ? 100000 : 2000
			}
		});
		httpAgent.destroy();
		httpsAgent.destroy();

		return successOrError;
	}
}