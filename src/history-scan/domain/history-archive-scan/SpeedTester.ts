import { Url } from '../../../shared/domain/Url';
import { RequestGenerator } from './RequestGenerator';
import { HttpQueue, RequestMethod } from '../HttpQueue';
import * as http from 'http';
import * as https from 'https';
import { CheckPointGenerator } from '../check-point/CheckPointGenerator';
import { injectable } from 'inversify';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';

@injectable()
export class SpeedTester {
	private concurrencyRange = [
		10, 15, 20, 25, 35, 50, 75, 100, 150, 200, 300, 400, 500
	].reverse();
	constructor(
		private checkPointGenerator: CheckPointGenerator,
		private httpQueue: HttpQueue
	) {}

	//buckets around the highestLedger are the largest
	async test(baseUrl: Url, highestLedger: number, nrOfCheckPoints = 1000) {
		if (highestLedger - 64 * nrOfCheckPoints < 0) return;
		this.httpQueue.cacheBusting = true;

		let concurrencyRangeIndex = 0;
		const concurrencyTimings: number[] = [];

		await asyncSleep(500);
		while (concurrencyRangeIndex < this.concurrencyRange.length) {
			console.log('concurrency', this.concurrencyRange[concurrencyRangeIndex]);
			const httpAgent = new http.Agent({
				keepAlive: true,
				maxSockets: this.concurrencyRange[concurrencyRangeIndex],
				maxFreeSockets: this.concurrencyRange[concurrencyRangeIndex],
				scheduling: 'fifo'
			});
			const httpsAgent = new https.Agent({
				keepAlive: true,
				maxSockets: this.concurrencyRange[concurrencyRangeIndex],
				maxFreeSockets: this.concurrencyRange[concurrencyRangeIndex],
				scheduling: 'fifo'
			});

			console.log('opening sockets');
			//first open the sockets
			const warmupResult = await this.testSmallFiles(
				baseUrl,
				highestLedger,
				this.concurrencyRange[concurrencyRangeIndex],
				this.concurrencyRange[concurrencyRangeIndex],
				//we need to warmup concurrency amount of connections because there is one HAS file per checkpoint
				httpAgent,
				httpsAgent,
				true
			);
			console.log(warmupResult.isErr());

			console.log('go');
			const start = new Date().getTime();
			const result = await this.testSmallFiles(
				baseUrl,
				highestLedger,
				nrOfCheckPoints,
				this.concurrencyRange[concurrencyRangeIndex],
				httpAgent,
				httpsAgent,
				false
			);
			if (result.isErr()) {
				console.log(result.error.message);
				concurrencyTimings.push(Infinity);
			} else {
				const stop = new Date().getTime();
				concurrencyTimings.push(Math.round((10 * (stop - start)) / 1000) / 10);

				console.log(
					`Concurrency: ${this.concurrencyRange[concurrencyRangeIndex]}, time Taken to execute: ${concurrencyTimings[concurrencyRangeIndex]} seconds`
				);
			}
			concurrencyRangeIndex++;
			httpAgent.destroy();
			httpsAgent.destroy();
			console.log('Waiting for next round');
			await asyncSleep(1000);
		}
		const fastestTime = Math.min(...concurrencyTimings);
		console.log(
			'Optimal concurrency',
			this.concurrencyRange[concurrencyTimings.indexOf(fastestTime)]
		);
		console.log(
			'estimated time to download all HAS files (minutes)',
			Math.round(
				(Math.floor(highestLedger / 64) * (fastestTime / nrOfCheckPoints)) / 60
			)
		);
		this.httpQueue.cacheBusting = false;
	}

	private async testSmallFiles(
		baseUrl: Url,
		highestLedger: number,
		nrOfCheckPoints: number,
		concurrency: number,
		httpAgent: http.Agent,
		httpsAgent: https.Agent,
		warmup: boolean
	) {
		const checkPoints = this.checkPointGenerator.generate(
			highestLedger - 64 * nrOfCheckPoints,
			highestLedger
		);

		const historyArchiveStateURLGenerator =
			RequestGenerator.generateHASRequests(
				baseUrl,
				checkPoints,
				RequestMethod.GET
			);

		const successOrError = await this.httpQueue.sendRequests(
			historyArchiveStateURLGenerator,
			{
				stallTimeMs: 150,
				concurrency: concurrency,
				nrOfRetries: 3,
				rampUpConnections: warmup,
				httpOptions: {
					httpAgent: httpAgent,
					httpsAgent: httpsAgent,
					responseType: 'json',
					timeoutMs: 2000
				}
			}
		);
		httpAgent.destroy();
		httpsAgent.destroy();

		return successOrError;
	}
}
