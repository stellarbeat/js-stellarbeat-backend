import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { Url } from '../../../core/domain/Url';
import { ScanError } from './ScanError';
import { CoreEntity } from '../../../core/domain/CoreEntity';

/**
 * Used to represent a chain of scans for a history url.
 * By grouping the initDate and the url, you get all the scans in a chain. A new initDate starts a new chain for the url.
 * Start and end dates are the times the scan was started and ended for this part of the chain.
 */
@Entity({ name: 'history_archive_scan_v2' })
export class Scan extends CoreEntity {
	//date where scan for the url was started
	@Column('timestamptz', { name: 'initializeDate' })
	public readonly scanChainInitDate: Date;

	@Index()
	@Column('timestamptz')
	public readonly startDate: Date;

	@Column('timestamptz', { nullable: false })
	public readonly endDate: Date;

	public baseUrl: Url;

	@Column('integer', { nullable: false })
	public readonly fromLedger: number = 0;

	@Column('integer', { nullable: true })
	public readonly toLedger: number | null = null;

	@Column('integer', { nullable: false })
	public readonly latestScannedLedger: number = 0;

	@Column('text', { nullable: true })
	public readonly latestScannedLedgerHeaderHash: string | null = null;

	@Column('smallint')
	public readonly concurrency: number = 0;

	@Column('boolean', { nullable: true })
	public readonly isSlowArchive: boolean | null = null;

	@OneToOne(() => ScanError, { nullable: true, cascade: true, eager: true })
	@JoinColumn()
	public readonly error: ScanError | null = null;

	constructor(
		scanChainInitDate: Date,
		startDate: Date,
		endDate: Date,
		url: Url,
		fromLedger: number,
		toLedger: number | null,
		latestScannedLedger = 0,
		latestScannedLedgerHeaderHash: string | null = null,
		concurrency = 0,
		archiveIsSlow: boolean | null = null,
		error: ScanError | null = null
	) {
		super();
		this.baseUrl = url;
		this.scanChainInitDate = scanChainInitDate;
		this.concurrency = concurrency;
		this.startDate = startDate;
		this.endDate = endDate;
		this.isSlowArchive = archiveIsSlow;
		this.fromLedger = fromLedger;
		this.toLedger = toLedger;
		this.error = error;
		this.latestScannedLedger = latestScannedLedger;
		this.latestScannedLedgerHeaderHash = latestScannedLedgerHeaderHash;
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

	hasError(): boolean {
		return this.error !== null;
	}

	public isStartOfScanChain() {
		return this.scanChainInitDate.getTime() === this.startDate.getTime();
	}

	/*
	Last ledger hash is not yet checked with trusted source,
	so we return the previous one that is surely verified through the previous header hash value
	because we verify ledgers in ascending order
	 */
	get latestVerifiedLedger() {
		if (this.latestScannedLedger === 0) return 0;

		return this.latestScannedLedger - 1;
	}
}
