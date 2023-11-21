import { ValueObject } from '../../../core/domain/ValueObject';
import { Column, Index } from 'typeorm';
import { err, ok, Result } from 'neverthrow';
import { createHash } from 'crypto';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';

export class OrganizationId extends ValueObject {
	@Column('varchar', { length: 100 })
	@Index('IDX_7867970695572b3f6561516414', { unique: true })
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
		try {
			const hash = createHash('md5');
			hash.update(homeDomain);
			return ok(new OrganizationId(hash.digest('hex')));
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
