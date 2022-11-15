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
	public latestScannedLedger = 0;

	@Column('text', { nullable: true })
	public latestScannedLedgerHeaderHash?: string;

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

	public get hasError() {
		return this.errorType !== null;
	}

	finish(endDate: Date, error?: ScanError): void {
		this.endDate = endDate;

		if (error) {
			this.errorType = error.type;
			this.errorUrl = error.url;
			this.errorMessage = error.message ? error.message : null;
		}
	}

	get isCompleted() {
		return this.latestScannedLedger === this.toLedger && !this.hasError;
	}
}
