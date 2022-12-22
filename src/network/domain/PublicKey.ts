import {
	Entity,
	Column,
	Index,
	Repository,
	PrimaryGeneratedColumn
} from 'typeorm';

import { err, ok, Result } from 'neverthrow';

export type PublicKeyRepository = Repository<PublicKey>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SnapShotUniqueIdentifier {}

@Entity('node_public_key')
export default class PublicKey implements SnapShotUniqueIdentifier {
	@PrimaryGeneratedColumn()
	id?: number; //todo: should be private and moved to IdentifiedDomainObject

	@Column('varchar', { length: 56, name: 'publicKey' })
	@Index({ unique: true })
	value: string;

	private constructor(publicKey: string) {
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
