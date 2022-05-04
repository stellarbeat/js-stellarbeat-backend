import { Url } from '../../../shared/domain/Url';
import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';

/**
 * Represents a scan result of a history archive.
 * If there is an error while fetching a checkpoint, it means we could not determine if there was a gap
 */
@Entity()
export class HistoryArchiveScan extends IdentifiedDomainObject {
	@Index()
	@Column({ nullable: false })
	public readonly startDate: Date;

	@Column({ nullable: false })
	public readonly endDate?: Date;

	@Index()
	@Column()
	public readonly url: string;

	@Column({ nullable: false })
	public readonly fromLedger: number;

	@Column({ nullable: false })
	public readonly toLedger: number;

	@Column({ name: 'gaps', type: 'simple-array' })
	private _checkPointGaps: number[] = [];

	@Column({ name: 'errors', type: 'simple-array' })
	private _checkPointErrors: number[] = [];

	private constructor(
		startDate: Date,
		endDate: Date,
		url: string,
		fromLedger: number,
		toLedger: number
	) {
		super();
		this.startDate = startDate;
		this.endDate = endDate;
		this.url = url;
		this.fromLedger = fromLedger;
		this.toLedger = toLedger;
	}

	static create(
		startDate: Date,
		endDate: Date,
		url: Url,
		fromLedger: number,
		toLedger: number
	) {
		const summary = new HistoryArchiveScan(
			startDate,
			endDate,
			url.value,
			fromLedger,
			toLedger
		);

		return summary;
	}

	get hasGaps() {
		return this._checkPointGaps.length > 0;
	}

	get checkPointGaps() {
		return this._checkPointGaps;
	}

	get hasErrors() {
		return this._checkPointErrors.length > 0;
	}

	get checkPointErrors() {
		return this._checkPointErrors;
	}
}
