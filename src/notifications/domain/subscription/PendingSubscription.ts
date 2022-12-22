import { Column, Entity } from 'typeorm';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../event/EventSourceId';
import { err, ok, Result } from 'neverthrow';
import validator from 'validator';
import { CoreEntity } from '../../../core/domain/CoreEntity';

export class PendingSubscriptionId {
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(value: string): Result<PendingSubscriptionId, Error> {
		if (!validator.isUUID(value)) return err(new Error('Invalid format'));
		return ok(new PendingSubscriptionId(value));
	}

	equals(other: PendingSubscriptionId) {
		return other.value === this.value;
	}
}

@Entity('subscription_pending')
export class PendingSubscription extends CoreEntity {
	@Column({ type: 'timestamptz', nullable: false })
	public readonly time: Date;

	@Column(() => PendingSubscriptionId)
	public pendingSubscriptionId: PendingSubscriptionId;

	@Column({
		type: 'jsonb',
		transformer: {
			from(values: { type: string; id: string }[]): EventSourceId[] {
				if (values === null) return [];
				return values.map((value) => {
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
				});
			},
			to(values: EventSourceId[]): { type: string; id: string }[] {
				return values.map((value) => {
					return {
						type: value.constructor.name,
						id: value.value
					};
				});
			}
		}
	})
	public readonly eventSourceIds: EventSourceId[];

	constructor(
		time: Date,
		pendingSubscriptionId: PendingSubscriptionId,
		eventSourceIds: EventSourceId[]
	) {
		super();
		this.time = time;
		this.pendingSubscriptionId = pendingSubscriptionId;
		this.eventSourceIds = eventSourceIds;
	}
}
