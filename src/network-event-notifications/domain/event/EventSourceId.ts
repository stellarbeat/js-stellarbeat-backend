import { err, ok, Result } from 'neverthrow';

export abstract class EventSourceId {
	public readonly value: string;
	protected constructor(value: string) {
		this.value = value;
	}

	equals(other: EventSourceId): boolean {
		return other.constructor === this.constructor && this.value === other.value;
	}
}
export class OrganizationId extends EventSourceId {
	constructor(value: string) {
		super(value);
	}
}

export class PublicKey extends EventSourceId {
	static create(publicKey: string): Result<PublicKey, Error> {
		if (publicKey.length !== 56) return err(new Error('Invalid length'));

		return ok(new PublicKey(publicKey));
	}
}

export class NetworkId extends EventSourceId {
	constructor(value: string) {
		super(value);
	}
}
