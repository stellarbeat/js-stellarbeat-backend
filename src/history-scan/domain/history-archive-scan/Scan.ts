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
	@Column('timestamptz', { nullable: false })
	public readonly initializeDate: Date;

	@Index()
	@Column('timestamptz', { nullable: false })
	public readonly startDate: Date;

	@Column('timestamptz', { nullable: true })
	public endDate: Date | null = null;

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

	protected constructor(
		initDate: Date,
		startDate: Date,
		fromLedger: number,
		baseUrl: Url,
		public concurrency = 50,
		public rangeSize = 1000000 //todo: move to config
	) {
		super();
		this.initializeDate = initDate;
		this.startDate = startDate;
		this.baseUrl = baseUrl;
		this.fromLedger = fromLedger;
	}

	static init(
		initDate: Date,
		fromLedger: number,
		baseUrl: Url,
		concurrency = 50,
		rangeSize = 1000000 //todo: move to config
	): Scan {
		return new Scan(
			initDate,
			initDate,
			fromLedger,
			baseUrl,
			concurrency,
			rangeSize
		);
	}

	static continue(
		previousScan: Scan,
		startDate: Date,
		concurrency = 50,
		rangeSize = 1000000
	): Scan {
		const scan = new Scan(
			previousScan.initializeDate,
			startDate,
			previousScan.latestVerifiedLedger + 1,
			previousScan.baseUrl,
			concurrency,
			rangeSize
		);

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

	markError(error: ScanError) {
		this.errorType = error.type;
		this.errorUrl = error.url;
		this.errorMessage = error.message ? error.message : null;
	}

	hasError(): boolean {
		return this.errorType !== null;
	}

	finish(endDate: Date): void {
		this.endDate = endDate;
	}

	public isStartOfScanChain() {
		return this.initializeDate.getTime() === this.startDate.getTime();
	}
}
