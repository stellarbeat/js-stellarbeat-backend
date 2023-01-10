import { ValueObject } from '../../../core/domain/ValueObject';
import { err, ok, Result } from 'neverthrow';
import valueValidator from 'validator';
import { Column } from 'typeorm';

export class StellarCoreVersion extends ValueObject {
	@Column({ type: 'varchar', nullable: false })
	public readonly value: string;

	private constructor(value: string) {
		super();
		this.value = value;
	}

	static create(value: string): Result<StellarCoreVersion, Error> {
		if (!valueValidator.isSemVer(value)) {
			return err(new Error('Invalid semver string'));
		}

		return ok(new StellarCoreVersion(value));
	}
}
