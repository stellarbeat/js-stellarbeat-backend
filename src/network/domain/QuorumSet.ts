import { ValueObject } from '../../core/domain/ValueObject';
import PublicKey from './PublicKey';
import { createHash } from 'crypto';

export class QuorumSet extends ValueObject {
	public constructor(
		public readonly threshold: number,
		public readonly validators: Array<PublicKey> = [],
		public readonly innerQuorumSets: Array<QuorumSet> = []
	) {
		super();
	}

	hash(): string {
		const hasher = createHash('sha256');
		hasher.update(JSON.stringify(this));
		return hasher.digest('hex');
	}

	equals(other: this): boolean {
		return this.hash() === other.hash();
	}
}
