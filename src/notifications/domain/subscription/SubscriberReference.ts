import { Column, Index } from 'typeorm';
import { v4 as uuidv4, validate } from 'uuid';
import { err, ok, Result } from 'neverthrow';

export class SubscriberReference {
	@Index()
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(): SubscriberReference {
		return new SubscriberReference(uuidv4());
	}

	static createFromValue(value: string): Result<SubscriberReference, Error> {
		if (!validate(value))
			return err(new Error('Not a valid SubscriberReference'));
		else return ok(new SubscriberReference(value));
	}
}
