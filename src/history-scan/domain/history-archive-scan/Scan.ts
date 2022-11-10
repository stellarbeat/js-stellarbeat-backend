import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { Url } from '../../../shared/domain/Url';
import { ScanError } from './ScanError';

/**
 * Represents a scan of a history archive.
 * If there is an error while fetching a checkpoint, it means we could not determine if there was a gap
 */
@Entity({ name: 'history_archive_scan' })
export class Scan extends IdentifiedDomainObject {
	@Index()
	@Column('timestamptz', { nullable: false })
	public readonly startDate: Date;

	@Column('timestamptz', { nullable: true })
	public endDate?: Date;

	public baseUrl: Url;

	@Column('bigint', { nullable: false })
	public readonly fromLedger: number;

	@Column('bigint', { nullable: false })
	public readonly toLedger: number;

	@Column('bigint', { nullable: false })
	public latestScannedLedger = 0;

	@Column('text')
	public latestScannedLedgerHeaderHash?: string;

	@Column(() => ScanError)
	public scanError?: ScanError;

	@Column('timestamptz', { nullable: true })
	public latestFullScan?: Date;

	constructor(
		startDate: Date,
		fromLedger: number,
		toLedger: number,
		baseUrl: Url,
		public maxConcurrency = 50,
		public chunkSize = 1000000
	) {
		super();
		this.startDate = startDate;
		this.baseUrl = baseUrl;
		this.fromLedger = fromLedger;
		this.toLedger = toLedger;
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

	public hasError(): boolean {
		return this.scanError !== undefined || this.scanError !== null;
	}

	markCompleted(endDate: Date): void {
		this.endDate = endDate;
	}

	get isCompleted() {
		return this.latestScannedLedger === this.toLedger && !this.hasError();
	}
}
