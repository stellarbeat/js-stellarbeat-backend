import { Column, Index } from 'typeorm';
import validator from 'validator';
import { Result, err, ok } from 'neverthrow';

export class UserId {
	@Index()
	@Column({ type: 'uuid', nullable: false, unique: true })
	public readonly value: string;

	private constructor(rawId: string) {
		this.value = rawId;
	}

	static create(rawId: string): Result<UserId, Error> {
		if (!validator.isUUID(rawId))
			return err(new Error('Invalid userId format'));
		return ok(new UserId(rawId));
	}
}
