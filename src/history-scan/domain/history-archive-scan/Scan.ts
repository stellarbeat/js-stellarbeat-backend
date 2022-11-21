import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { Url } from '../../../shared/domain/Url';
import { ScanError, ScanErrorType } from './ScanError';

/**
 * Used to represent a chain of scans for a history url.
 * By grouping the initDate and the url, you get all the scans in a chain. A new initDate starts a new chain for the url.
 *
 * When you init a scan, you create the start of the chain.
 * When you continue a scan, you create a new part of the chain, where the previous one ended.
 */
@Entity({ name: 'history_archive_scan_v2' })
export class Scan extends IdentifiedDomainObject {
	//date where scan for the url was started
	@Column('timestamptz', { name: 'initDate' })
	private _scanChainInitDate: Date;

	@Index()
	@Column('timestamptz', { name: 'startDate' })
	private _startDate: Date;

	@Column('timestamptz', { nullable: true, name: 'endDate' })
	private _endDate: Date | null = null;

	public baseUrl: Url;

	@Column('bigint', { nullable: false })
	public readonly fromLedger: number;

	@Column('bigint', { nullable: false })
	public latestVerifiedLedger = 0;

	@Column('text', { nullable: true })
	public latestVerifiedLedgerHeaderHash: string | null = null;

	@Column('enum', { nullable: true, enum: ScanErrorType })
	public errorType: ScanErrorType | null = null;

	@Column('text', { nullable: true })
	public errorUrl: string | null = null;

	@Column('text', { nullable: true })
	public errorMessage: string | null = null;

	@Column('tinyint')
	public concurrency: number;

	protected constructor(
		scanChainInitDate: Date,
		startDate: Date,
		fromLedger: number,
		baseUrl: Url,
		concurrency = 50
	) {
		super();
		this._scanChainInitDate = startDate;
		this._startDate = startDate;
		this.baseUrl = baseUrl;
		this.fromLedger = fromLedger;
		this.concurrency = concurrency;
	}

	static startNewScanChain(
		scanChainInitDate: Date,
		fromLedger: number,
		baseUrl: Url,
		concurrency = 50
	): Scan {
		return new Scan(
			scanChainInitDate,
			scanChainInitDate,
			fromLedger,
			baseUrl,
			concurrency
		);
	}

	static continueScanChain(
		previousScan: Scan,
		startDate: Date,
		concurrency = 50
	): Scan {
		const scan = new Scan(
			previousScan.scanChainInitDate,
			startDate,
			previousScan.latestVerifiedLedger + 1,
			previousScan.baseUrl,
			concurrency
		);

		scan._scanChainInitDate = previousScan.scanChainInitDate;
		scan.updateLatestVerifiedLedger(
			previousScan.latestVerifiedLedger,
			previousScan.latestVerifiedLedgerHeaderHash
		);

		return scan;
	}

	@Index()
	@Column('text')
	private get url(): string {
		return this.baseUrl.value;
	}

	private set url(value: string) {
		const baseUrlResult = Url.create(value);
		if (baseUrlResult.isErr()) throw baseUrlResult.error;

		this.baseUrl = baseUrlResult.value;
	}

	updateLatestVerifiedLedger(
		latestVerifiedLedger: number,
		latestVerifiedLedgerHeaderHash: string | null = null
	) {
		this.latestVerifiedLedger = latestVerifiedLedger;
		this.latestVerifiedLedgerHeaderHash = latestVerifiedLedgerHeaderHash;
	}

	fail(error: ScanError, time: Date) {
		this.errorType = error.type;
		this.errorUrl = error.url;
		this.errorMessage = error.message ? error.message : null;
		this._endDate = time;
		if (this.startDate === null) this._startDate = time;
	}

	hasError(): boolean {
		return this.errorType !== null;
	}

	start(time: Date): void {
		if (!this._scanChainInitDate) this._scanChainInitDate = time;
		this._startDate = time;
	}

	get scanChainInitDate() {
		return this._scanChainInitDate;
	}

	get startDate() {
		return this._startDate;
	}

	end(endDate: Date): void {
		this._endDate = endDate;
	}

	get endDate() {
		return this._endDate;
	}

	public isStartOfScanChain() {
		return this.scanChainInitDate?.getTime() === this.startDate?.getTime();
	}
}
