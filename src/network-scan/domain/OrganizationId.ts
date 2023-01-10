import { ValueObject } from '../../core/domain/ValueObject';
import { Column, Index } from 'typeorm';
import { err, ok, Result } from 'neverthrow';

export class OrganizationId extends ValueObject {
	@Column('varchar', { length: 100 })
	@Index({ unique: true })
	public readonly value: string;

	private constructor(organizationId: string) {
		super();
		this.value = organizationId;
	}

	static create(organizationId: string): Result<OrganizationId, Error> {
		if (organizationId.length > 100)
			return err(new Error('Invalid organization id length'));
		return ok(new OrganizationId(organizationId));
	}
}
