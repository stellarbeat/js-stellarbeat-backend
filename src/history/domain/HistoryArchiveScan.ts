import { Url } from '../../shared/domain/Url';
import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../shared/domain/IdentifiedDomainObject';

/**
 * Represents a scan of a history archive.
 * If there is an error while fetching a checkpoint, it means we could not determine if there was a gap
 */
@Entity()
export class HistoryArchiveScan extends IdentifiedDomainObject {
	@Index()
	@Column({ nullable: false })
	public readonly scanDate: Date;

	@Column({ nullable: true })
	public endDate?: Date;

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
		scanDate: Date,
		url: string,
		fromLedger: number,
		toLedger: number
	) {
		super();
		this.scanDate = scanDate;
		this.url = url;
		this.fromLedger = fromLedger;
		this.toLedger = toLedger;
	}

	static create(
		scanDate: Date,
		url: Url,
		fromLedger: number,
		toLedger: number
	) {
		return new HistoryArchiveScan(scanDate, url.value, fromLedger, toLedger);
	}

	get hasGaps() {
		return this._checkPointGaps.length > 0;
	}

	get checkPointGaps() {
		return this._checkPointGaps;
	}

	addCheckPointGaps(checkPoints: number[]) {
		this._checkPointGaps = this._checkPointGaps
			.concat(checkPoints)
			.slice(0, 10); //only store 10 in db
	}

	get hasErrors() {
		return this._checkPointErrors.length > 0;
	}

	get checkPointErrors() {
		return this._checkPointErrors;
	}

	addCheckPointErrors(checkPoints: number[]) {
		this._checkPointErrors = this._checkPointErrors
			.concat(checkPoints)
			.slice(0, 10); //only store 10 in db
	}
}
