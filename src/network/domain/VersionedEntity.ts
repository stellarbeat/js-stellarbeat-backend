import { Column, Index } from 'typeorm';
import { IdentifiedEntity } from '../../core/domain/IdentifiedEntity';
import { Change } from './Change';

export abstract class VersionedEntity extends IdentifiedEntity {
	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	@Column('timestamptz', { nullable: false })
	@Index()
	public readonly startDate: Date;

	@Column('timestamptz', { name: 'endDate', nullable: false })
	@Index()
	public _endDate: Date = VersionedEntity.MAX_DATE;

	protected _changes?: Change[];
	public previousVersion?: this;

	protected constructor(startDate: Date = new Date()) {
		super();
		this.startDate = startDate;
	}

	public startNewVersion(startDate: Date): this {
		this._endDate = startDate;
		const nextVersion = this.cloneWithNewStartDate(startDate);
		nextVersion.previousVersion = this;

		return nextVersion;
	}

	protected abstract cloneWithNewStartDate(startDate: Date): this;

	get changes(): Change[] {
		if (!this._changes) {
			this._changes = [];
		}
		return this._changes;
	}

	public hasChanges() {
		return this.changes.length > 0;
	}

	registerChange(change: Change) {
		this.changes.push(change);
	}

	get endDate(): Date {
		return this._endDate;
	}
}
