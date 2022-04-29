import { Url } from '../../shared/domain/Url';
import { Column, Entity, Index } from 'typeorm';
import { IdentifiedDomainObject } from '../../shared/domain/IdentifiedDomainObject';
import { CheckPointScan } from './CheckPointScan';

/**
 * Represents a scan of a history archive.
 * If there is an error while fetching a checkpoint, it means we could not determine if there was a gap
 */
@Entity()
export class HistoryArchiveScanSummary extends IdentifiedDomainObject {
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
		toLedger: number,
		checkPointScans: CheckPointScan[]
	) {
		const summary = new HistoryArchiveScanSummary(
			startDate,
			endDate,
			url.value,
			fromLedger,
			toLedger
		);
		summary.processCheckPointScans(checkPointScans);

		return summary;
	}

	get hasGaps() {
		return this._checkPointGaps.length > 0;
	}

	get checkPointGaps() {
		return this._checkPointGaps;
	}

	public processCheckPointScans(checkPointScans: CheckPointScan[]) {
		this._checkPointGaps = checkPointScans
			.filter((checkPointScan) => checkPointScan.hasGaps())
			.map((checkPointScan) => checkPointScan.checkPoint)
			.slice(0, 10);

		this._checkPointErrors = checkPointScans
			.filter((checkPointScan) => checkPointScan.hasErrors())
			.map((checkPointScan) => checkPointScan.checkPoint)
			.slice(0, 10);
	}

	get hasErrors() {
		return this._checkPointErrors.length > 0;
	}

	get checkPointErrors() {
		return this._checkPointErrors;
	}
}
