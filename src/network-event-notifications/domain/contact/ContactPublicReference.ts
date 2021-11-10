import { Column, Index } from 'typeorm';
import { v4 as uuidv4, validate } from 'uuid';
import { err, ok, Result } from 'neverthrow';

export class ContactPublicReference {
	@Index()
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(): ContactPublicReference {
		return new ContactPublicReference(uuidv4());
	}

	static createFromValue(value: string): Result<ContactPublicReference, Error> {
		if (!validate(value))
			return err(new Error('Not a valid ContactPublicReference'));
		else return ok(new ContactPublicReference(value));
	}
}
