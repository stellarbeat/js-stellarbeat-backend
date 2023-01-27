import { ValueObject } from '../../../core/domain/ValueObject';
import { Column, Index } from 'typeorm';
import { ok, Result } from 'neverthrow';
import { createHash } from 'crypto';

export class OrganizationId extends ValueObject {
	@Column('varchar', { length: 100 })
	@Index({ unique: true })
	public readonly value: string;

	private constructor(organizationId: string) {
		super();
		this.value = organizationId;
	}

	static create(
		homeDomain: string,
		id?: string
	): Result<OrganizationId, Error> {
		if (id) return ok(new OrganizationId(id));
		const hash = createHash('md5');
		hash.update(homeDomain);
		return ok(new OrganizationId(hash.digest('hex')));
	}
}
