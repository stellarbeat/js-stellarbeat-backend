import { err, ok, Result } from 'neverthrow';
import { Column } from 'typeorm';

export interface EventSourceId {
	readonly value: string;
}

export class OrganizationId implements EventSourceId {
	constructor(public readonly value: string) {}
}

export class PublicKey implements EventSourceId {
	private type = 'publicKey';
	constructor(public readonly value: string) {}

	static create(publicKey: string): Result<PublicKey, Error> {
		if (publicKey.length !== 56) return err(new Error('Invalid length'));

		return ok(new PublicKey(publicKey));
	}
}

export class NetworkId implements EventSourceId {
	constructor(public readonly value: string) {}
}

export class EventSource<T extends EventSourceId> {
	@Column({
		type: 'json',
		transformer: {
			from(value: { type: string; id: string }): EventSourceId {
				if (value.type === OrganizationId.name)
					return new OrganizationId(value.id);
				if (value.type === PublicKey.name) {
					const publicKeyResult = PublicKey.create(value.id);
					if (publicKeyResult.isErr()) {
						throw new Error(`corrupt public key in database: ${value.id}`);
					}
					return publicKeyResult.value;
				}
				if (value.type === NetworkId.name) return new NetworkId(value.id);

				throw new Error(`Invalid event source type ${value.type}`);
			},
			to(value: T): { type: string; id: string } {
				return {
					type: value.constructor.name,
					id: value.value
				};
			}
		}
	})
	public readonly id: T;

	constructor(id: T) {
		this.id = id;
	}

	equals(other: EventSource<EventSourceId>): boolean {
		return (
			other.constructor === this.constructor && this.id.value === other.id.value
		);
	}
}
