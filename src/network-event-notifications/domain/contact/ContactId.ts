import { Column, Index } from 'typeorm';
import validator from 'validator';
import { Result, err, ok } from 'neverthrow';

export class ContactId {
	@Index()
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	private constructor(rawId: string) {
		this.value = rawId;
	}

	static create(rawId: string): Result<ContactId, Error> {
		if (!validator.isUUID(rawId))
			return err(new Error('Invalid contactId format'));
		return ok(new ContactId(rawId));
	}
}
