import { Column, Index } from 'typeorm';
import { IdentifiedValueObject } from '../../core/domain/IdentifiedValueObject';

export abstract class Snapshot extends IdentifiedValueObject {
	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	@Column('timestamptz', { nullable: false })
	@Index()
	public readonly startDate: Date;

	@Column('timestamptz', { name: 'endDate', nullable: false })
	@Index()
	public endDate: Date = Snapshot.MAX_DATE;

	protected constructor(startDate: Date = new Date()) {
		super();
		this.startDate = startDate;
	}

	public abstract copy(startDate: Date): this;

	public abstract containsUpdates(base: this): boolean;
}
