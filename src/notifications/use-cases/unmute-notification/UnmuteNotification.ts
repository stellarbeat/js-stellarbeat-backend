import { UnmuteNotificationDTO } from './UnmuteNotificationDTO';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { inject, injectable } from 'inversify';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { err, ok, Result } from 'neverthrow';
import { SubscriberReference } from '../../domain/subscription/SubscriberReference';
import { EventType } from '../../domain/event/Event';
import isPartOfStringEnum from '../../../core/utilities/TypeGuards';
import { PersistenceError } from './UnmuteNotificationError';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';

@injectable()
export class UnmuteNotification {
	constructor(
		@inject('SubscriberRepository')
		protected SubscriberRepository: SubscriberRepository,
		protected eventSourceIdFactory: EventSourceIdFactory
	) {}

	public async execute(
		dto: UnmuteNotificationDTO
	): Promise<Result<void, Error>> {
		try {
			const eventType = dto.eventType;
			if (!isPartOfStringEnum(eventType, EventType))
				return err(new Error('Invalid event type: ' + eventType));

			const subscriberReference = SubscriberReference.createFromValue(
				dto.subscriberReference
			);
			if (subscriberReference.isErr()) return err(subscriberReference.error);

			const eventSourceIdResult = await this.eventSourceIdFactory.create(
				dto.eventSourceType,
				dto.eventSourceId,
				new Date()
			);
			if (eventSourceIdResult.isErr()) return err(eventSourceIdResult.error);

			const subscriber =
				await this.SubscriberRepository.findOneBySubscriberReference(
					subscriberReference.value
				);
			if (subscriber === null) return err(new Error('Subscriber not found'));

			subscriber.unMuteNotificationFor(eventSourceIdResult.value, eventType);
			await this.SubscriberRepository.save([subscriber]);

			return ok(undefined);
		} catch (e) {
			return err(new PersistenceError(mapUnknownToError(e)));
		}
	}
}
