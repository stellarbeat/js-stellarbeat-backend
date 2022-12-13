import { Url } from '../../../core/domain/Url';
import { CategoryRequestMeta, RequestGenerator } from './RequestGenerator';
import {
	HttpQueue,
	Request,
	RequestMethod
} from '../../../core/services/HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { injectable } from 'inversify';
import { asyncSleep } from '../../../core/utilities/asyncSleep';
import { Category } from '../history-archive/Category';
import { sortDescending } from '../../../core/utilities/sortDescending';
import { err, ok, Result } from 'neverthrow';

export interface PerformanceTestResult {
	optimalConcurrency: number;
	timeMsPerFile: number;
	isSlowArchive: boolean;
}

interface TestSettings {
	highestLedger: number;
	nrOfCheckPoints: number;
	concurrency: number;
	warmup: boolean;
	largeFiles: boolean;
}

@injectable()
export class ArchivePerformanceTester {
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private httpQueue: HttpQueue,
		private maxTimeMSPerFile = 30 //how much time can we spend on downloading a small file on average with concurrency.
	) {}

	async test(
		baseUrl: Url,
		highestLedger: number,
		largeFiles = false,
		concurrencyRange = [50, 35, 25, 20, 15, 10],
		nrOfCheckPoints = 5000
	): Promise<Result<PerformanceTestResult, Error>> {
		const concurrencyRangeSorted = sortDescending(concurrencyRange);
		let concurrencyRangeIndex = 0;
		const concurrencyTimings: number[] = [];
		let consecutiveIncreasingCount = 0; //we will stop after three consecutive increasing timings.
		let previousDuration = Infinity;

		while (
			concurrencyRangeIndex < concurrencyRangeSorted.length &&
			consecutiveIncreasingCount < 2
		) {
			const { httpAgent, httpsAgent } =
				ArchivePerformanceTester.createHttpAgents(
					concurrencyRangeSorted[concurrencyRangeIndex]
				);
			//first open the sockets to have consistent test results (opening sockets can take longer than request on opened socket)
			const warmupSettings: TestSettings = {
				highestLedger: highestLedger,
				warmup: true,
				nrOfCheckPoints: concurrencyRangeSorted[concurrencyRangeIndex],
				concurrency: concurrencyRangeSorted[concurrencyRangeIndex],
				largeFiles: largeFiles
			};

			await this.testDownload(
				baseUrl,
				//we need to warmup concurrency amount of connections because there is one HAS-file per checkpoint
				httpAgent,
				httpsAgent,
				warmupSettings
			);

			const settings: TestSettings = {
				highestLedger: highestLedger,
				warmup: true,
				nrOfCheckPoints: nrOfCheckPoints,
				concurrency: concurrencyRangeSorted[concurrencyRangeIndex],
				largeFiles: largeFiles
			};
			const duration = await this.measureFilesTest(
				baseUrl,
				httpAgent,
				httpsAgent,
				settings
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
			return err(new Error('Could not determine optimal concurrency'));

		const optimalConcurrencyIndex = concurrencyTimings.indexOf(fastestTime);
		const optimalConcurrency = concurrencyRangeSorted[optimalConcurrencyIndex];
		const timeMsPerFile =
			concurrencyTimings[optimalConcurrencyIndex] / nrOfCheckPoints;

		return ok({
			optimalConcurrency,
			timeMsPerFile,
			isSlowArchive: timeMsPerFile > this.maxTimeMSPerFile
		});
	}

	private async measureFilesTest(
		baseUrl: Url,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		settings: TestSettings
	): Promise<number> {
		const start = new Date().getTime();
		const result = await this.testDownload(
			baseUrl,
			httpAgent,
			httpsAgent,
			settings
		);
		if (result.isErr()) {
			return Infinity;
		} else {
			const stop = new Date().getTime();
			return Math.round(10 * (stop - start)) / 10;
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
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		settings: TestSettings
	): Promise<Result<void, Error>> {
		const fromLedger = ArchivePerformanceTester.notEnoughCheckPointsInArchive(
			settings.highestLedger,
			settings.nrOfCheckPoints
		)
			? 0
			: settings.highestLedger - 64 * settings.nrOfCheckPoints;

		const checkPoints = this.checkPointGenerator.generate(
			fromLedger,
			settings.highestLedger
		);

		let requests: IterableIterator<
			Request<CategoryRequestMeta | Record<string, unknown>>
		>;
		if (!settings.largeFiles)
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
			concurrency: settings.concurrency,
			nrOfRetries: 1,
			rampUpConnections: settings.warmup,
			httpOptions: {
				httpAgent: httpAgent,
				httpsAgent: httpsAgent,
				responseType: 'json',
				socketTimeoutMs: settings.largeFiles ? 100000 : 2000,
				connectionTimeoutMs: settings.largeFiles ? 100000 : 2000
			},
			cacheBusting: true
		});
		httpAgent.destroy();
		httpsAgent.destroy();

		return successOrError;
	}
}
