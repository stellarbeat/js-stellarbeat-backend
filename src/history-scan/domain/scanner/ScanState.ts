import { Url } from '../../../core/domain/Url';
import * as http from 'http';
import * as https from 'https';
import { LedgerHeader } from './Scanner';

export abstract class ScanState {
	protected constructor(
		public readonly baseUrl: Url,
		public readonly concurrency: number,
		public readonly httpAgent: http.Agent,
		public readonly httpsAgent: https.Agent
	) {}
}

export class BucketScanState extends ScanState {
	constructor(
		public readonly baseUrl: Url,
		public readonly concurrency: number,
		public readonly httpAgent: http.Agent,
		public readonly httpsAgent: https.Agent,
		public bucketHashesToScan: Set<string>
	) {
		super(baseUrl, concurrency, httpAgent, httpsAgent);
	}
}

export class CategoryScanState extends ScanState {
	constructor(
		public readonly baseUrl: Url,
		public readonly concurrency: number,
		public readonly httpAgent: http.Agent,
		public readonly httpsAgent: https.Agent,
		public readonly checkPoints: IterableIterator<number>,
		public readonly bucketListHashes: Map<number, string>,
		public readonly previousLedgerHeader?: LedgerHeader
	) {
		super(baseUrl, concurrency, httpAgent, httpsAgent);
	}
}
