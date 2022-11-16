import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { Url } from '../../../shared/domain/Url';
import { ScanError, ScanErrorType } from './ScanError';

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
	public latestVerifiedLedger = 0;

	@Column('text', { nullable: true })
	public latestVerifiedLedgerHeaderHash?: string;

	@Column('enum', { nullable: true, enum: ScanErrorType })
	public errorType: ScanErrorType | null = null;

	@Column('text', { nullable: true })
	public errorUrl: string | null = null;

	@Column('text', { nullable: true })
	public errorMessage: string | null = null;

	@Column('boolean')
	public isFullScan = false;

	constructor(
		startDate: Date,
		fromLedger: number,
		toLedger: number,
		baseUrl: Url,
		public concurrency = 50,
		public rangeSize = 1000000
	) {
		super();
		this.startDate = startDate;
		this.baseUrl = baseUrl;
		this.fromLedger = fromLedger;
		this.toLedger = toLedger;
		if (this.fromLedger > this.toLedger) throw new Error('invalid scan range'); //todo: validation logic in factory
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

	finish(
		endDate: Date,
		latestVerifiedLedger: number,
		latestVerifiedLedgerHeaderHash?: string,
		error?: ScanError
	): void {
		this.latestVerifiedLedger = latestVerifiedLedger;
		this.latestVerifiedLedgerHeaderHash = latestVerifiedLedgerHeaderHash;
		this.endDate = endDate;

		if (error) {
			this.errorType = error.type;
			this.errorUrl = error.url;
			this.errorMessage = error.message ? error.message : null;
		}
	}
}
