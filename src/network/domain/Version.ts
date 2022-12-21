import { Column, Index } from 'typeorm';

export class Version {
	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	public isModified = false;
	private _isNew = false;

	@Column('timestamptz', { nullable: false })
	@Index()
	public readonly startDate: Date = new Date();

	@Column('timestamptz', { name: 'endDate', nullable: false })
	@Index()
	public endDate: Date = Version.MAX_DATE;

	static createNew(): Version {
		const snapshot = new Version();
		snapshot._isNew = true;

		return snapshot;
	}

	get isNew(): boolean {
		return this._isNew;
	}

	modify() {
		this.isModified = true;
	}

	previousVersionShouldBeArchived(): boolean {
		return !this.isNew && this.isModified;
	}
}
