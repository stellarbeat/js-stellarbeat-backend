import { Column, Entity } from 'typeorm';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../event/EventSourceId';
import { IdentifiedDomainObject } from '../../../shared/domain/IdentifiedDomainObject';

export class PendingSubscriptionId {
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	constructor(value: string) {
		this.value = value;
	}
}

@Entity('contact_pending_subscription')
export class PendingSubscription extends IdentifiedDomainObject {
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
