import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';
import { Url } from '../../../shared/domain/Url';

/**
 * Represents a scan of a history archive.
 * If there is an error while fetching a checkpoint, it means we could not determine if there was a gap
 */
@Entity()
export class HistoryArchiveScan extends IdentifiedDomainObject {
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

	@Column('boolean')
	public hasGap = false;

	@Column('text', { nullable: true })
	private gapUrl?: string;

	@Column('bigint', { nullable: true })
	private gapCheckPoint?: number;

	@Column('boolean')
	private hasError = false;

	@Column('text', { nullable: true })
	private errorMessage?: string;

	@Column('smallint', { nullable: true })
	private errorStatus?: number;

	@Column('text', { nullable: true })
	private errorCode?: string;

	@Column('text', { nullable: true })
	private errorUrl?: string;

	static CONCURRENCY_RANGE = [400, 300, 200, 100, 50, 25, 15, 0];

	@Column('smallint', { nullable: false })
	private concurrencyRangeIndex = 0; //todo: think about better solution

	constructor(
		startDate: Date,
		fromLedger: number,
		toLedger: number,
		baseUrl: Url
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

	public get concurrency(): number {
		return HistoryArchiveScan.CONCURRENCY_RANGE[this.concurrencyRangeIndex];
	}

	markGap(
		url: Url,
		date: Date,
		latestScannedLedger: number,
		checkPoint?: number
	): void {
		this.hasGap = true;
		this.gapUrl = url.value;
		this.gapCheckPoint = checkPoint;
		this.latestScannedLedger = latestScannedLedger;
		this.endDate = date;
	}

	markError(
		url: Url,
		date: Date,
		latestScannedLedger: number,
		message: string,
		status?: number,
		code?: string
	): void {
		this.hasError = true;
		this.errorUrl = url.value;
		this.endDate = date;
		this.errorStatus = status;
		this.errorCode = code;
		this.errorMessage = message;
		this.latestScannedLedger = latestScannedLedger;
	}

	markCompleted(endDate: Date): void {
		this.latestScannedLedger = this.toLedger;
		this.hasGap = false;
		this.hasError = false;
		this.endDate = endDate;
	}

	lowerConcurrency() {
		if (
			this.concurrencyRangeIndex <
			HistoryArchiveScan.CONCURRENCY_RANGE.length - 1
		)
			this.concurrencyRangeIndex++;
	}

	get isCompleted() {
		return (
			this.latestScannedLedger === this.toLedger &&
			!this.hasGap &&
			!this.hasError
		);
	}
}
