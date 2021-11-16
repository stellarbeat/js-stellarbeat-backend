import { injectable } from 'inversify';
import { EntityRepository, QueryBuilder, Repository } from 'typeorm';
import { Subscriber } from '../../../domain/subscription/Subscriber';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { UserId } from '../../../domain/subscription/UserId';
import { v4 as uuidv4 } from 'uuid';
import {
	PendingSubscription,
	PendingSubscriptionId
} from '../../../domain/subscription/PendingSubscription';
import { SubscriberReference } from '../../../domain/subscription/SubscriberReference';

@injectable()
@EntityRepository(Subscriber)
export class TypeOrmSubscriberRepository
	extends Repository<Subscriber>
	implements SubscriberRepository
{
	nextPendingSubscriptionId(): PendingSubscriptionId {
		const pendingSubscriptionIdResult = PendingSubscriptionId.create(uuidv4());
		if (pendingSubscriptionIdResult.isErr())
			throw pendingSubscriptionIdResult.error;
		return pendingSubscriptionIdResult.value;
	}

	async findOneByPendingSubscriptionId(
		pendingSubscriptionId: PendingSubscriptionId
	): Promise<Subscriber | null> {
		const subscriber = await super.findOne({
			join: {
				alias: 'subscriber',
				innerJoin: { pendingSubscription: 'subscriber.pendingSubscription' }
			},
			where: (qb: any) => {
				qb.where(
					'"pendingSubscription"."pendingSubscriptionIdValue" = :pendingSubscriptionId',
					{ pendingSubscriptionId: pendingSubscriptionId.value }
				);
			}
		});

		return subscriber ? subscriber : null;
	}

	async findOneByUserId(userId: UserId): Promise<Subscriber | null> {
		const subscriber = await super.findOne({
			where: {
				userId: userId
			}
		});

		return subscriber ? subscriber : null;
	}

	async findOneBySubscriberReference(
		subscriberReference: SubscriberReference
	): Promise<Subscriber | null> {
		const subscriber = await super.findOne({
			where: {
				subscriberReference: subscriberReference
			}
		});

		return subscriber ? subscriber : null;
	}
}
