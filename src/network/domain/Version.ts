import { Column, Index } from 'typeorm';

export class Version {
	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	private _isInitial = false;

	@Column('timestamptz', { nullable: false })
	@Index()
	public readonly startDate: Date;

	@Column('timestamptz', { name: 'endDate', nullable: false })
	@Index()
	public endDate: Date = Version.MAX_DATE;

	private constructor(startDate: Date = new Date()) {
		this.startDate = startDate;
	}

	static createInitial(startDate: Date): Version {
		const version = new Version(startDate);
		version._isInitial = true;

		return version;
	}

	static createNext(startDate: Date): Version {
		return new Version(startDate);
	}

	get isInitial(): boolean {
		return this._isInitial;
	}

	createNextVersion(startDate: Date): Version {
		return Version.createNext(startDate);
	}
}
