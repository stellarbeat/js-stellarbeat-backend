import { ValueObject } from '../../../core/domain/ValueObject';
import PublicKey from '../node/PublicKey';
import { createHash } from 'crypto';
import { Type } from 'class-transformer';

export class QuorumSet extends ValueObject {
	public readonly threshold: number;
	@Type(() => PublicKey)
	public readonly validators: Array<PublicKey>;
	@Type(() => QuorumSet)
	public readonly innerQuorumSets: Array<QuorumSet>;

	public constructor(
		threshold: number,
		validators: Array<PublicKey> = [],
		innerQuorumSets: Array<QuorumSet> = []
	) {
		super();
		this.threshold = threshold;
		this.validators = validators;
		this.innerQuorumSets = innerQuorumSets;
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
