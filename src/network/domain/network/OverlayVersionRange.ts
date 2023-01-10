import { ValueObject } from '../../../core/domain/ValueObject';
import { Result, err, ok } from 'neverthrow';
import { Column } from 'typeorm';

export class OverlayVersionRange extends ValueObject {
	@Column({ type: 'smallint', nullable: false })
	public readonly min: number;

	@Column({ type: 'smallint', nullable: false })
	public readonly max: number;

	private constructor(min: number, max: number) {
		super();
		this.max = max;
		this.min = min;
	}

	static create(
		minVersion: number,
		maxVersion: number
	): Result<OverlayVersionRange, Error> {
		if (minVersion > maxVersion) {
			return err(
				new Error(
					'Min overlay version cannot be greater or equal than max version'
				)
			);
		}

		return ok(new OverlayVersionRange(minVersion, maxVersion));
	}

	equals(other: this): boolean {
		return this.min === other.min && this.max === other.max;
	}
}
