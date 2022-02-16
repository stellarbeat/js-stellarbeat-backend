import { Url } from '../../shared/domain/Url';
import { Column, Entity } from 'typeorm';

/**
 * Represents a scan of a history archive.
 * If there is an error while fetching a checkpoint, it means we could not determine if there was a gap
 */
@Entity()
export class HistoryArchiveScan {
	@Column({ nullable: false })
	public readonly scanDate: Date;

	@Column({ nullable: false })
	public readonly historyArchiveUrl: string;

	@Column({ nullable: false })
	public readonly fromLedger: number;

	@Column({ nullable: false })
	public readonly toLedger: number;

	@Column({ name: 'gaps' })
	private _checkPointGaps: number[] = [];

	@Column({ name: 'errors' })
	private _checkPointErrors: number[] = [];

	constructor(
		scanDate: Date,
		historyArchiveUrl: Url,
		fromLedger: number,
		toLedger: number
	) {
		this.scanDate = scanDate;
		this.historyArchiveUrl = historyArchiveUrl.value;
		this.fromLedger = fromLedger;
		this.toLedger = toLedger;
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
