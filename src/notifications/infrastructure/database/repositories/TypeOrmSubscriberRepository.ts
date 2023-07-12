import { injectable } from 'inversify';
import { Repository } from 'typeorm';
import { Subscriber } from '../../../domain/subscription/Subscriber';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { UserId } from '../../../domain/subscription/UserId';
import { v4 as uuidv4 } from 'uuid';
import { PendingSubscriptionId } from '../../../domain/subscription/PendingSubscription';
import { SubscriberReference } from '../../../domain/subscription/SubscriberReference';

@injectable()
export class TypeOrmSubscriberRepository implements SubscriberRepository {
	constructor(private baseRepository: Repository<Subscriber>) {}

	async save(subscribers: Subscriber[]): Promise<Subscriber[]> {
		return await this.baseRepository.save(subscribers);
	}

	find(): Promise<Subscriber[]> {
		return this.baseRepository.find();
	}

	remove(subscriber: Subscriber): Promise<Subscriber> {
		return this.baseRepository.remove(subscriber);
	}

	nextPendingSubscriptionId(): PendingSubscriptionId {
		const pendingSubscriptionIdResult = PendingSubscriptionId.create(uuidv4());
		if (pendingSubscriptionIdResult.isErr())
			throw pendingSubscriptionIdResult.error;
		return pendingSubscriptionIdResult.value;
	}

	async findOneByPendingSubscriptionId(
		pendingSubscriptionId: PendingSubscriptionId
	): Promise<Subscriber | null> {
		const subscriber = await this.baseRepository.findOne({
			relations: ['pendingSubscription'],
			where: {
				pendingSubscription: {
					pendingSubscriptionId: {
						value: pendingSubscriptionId.value
					}
				}
			}
		});

		return subscriber ? subscriber : null;
	}

	async findOneByUserId(userId: UserId): Promise<Subscriber | null> {
		const subscriber = await this.baseRepository.findOne({
			where: {
				userId: userId
			}
		});

		return subscriber ? subscriber : null;
	}

	async findOneBySubscriberReference(
		subscriberReference: SubscriberReference
	): Promise<Subscriber | null> {
		const subscriber = await this.baseRepository.findOne({
			where: {
				subscriberReference: subscriberReference
			}
		});

		return subscriber ? subscriber : null;
	}
}
