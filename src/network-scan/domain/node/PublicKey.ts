import { Column, Index } from 'typeorm';

import { err, ok, Result } from 'neverthrow';
import { ValueObject } from '../../../core/domain/ValueObject';

export default class PublicKey extends ValueObject {
	@Column('varchar', { length: 56 })
	@Index({ unique: true })
	value: string;

	private constructor(publicKey: string) {
		super();
		this.value = publicKey;
	}

	static create(publicKey: string): Result<PublicKey, Error> {
		if (publicKey.length !== 56) {
			return err(new Error('Invalid public key length'));
		}
		if (!publicKey.startsWith('G')) {
			return err(new Error('Invalid public key prefix'));
		}
		return ok(new PublicKey(publicKey));
	}
}
