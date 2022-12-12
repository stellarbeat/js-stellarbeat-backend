import { EventSourceIdDTO, SubscribeDTO } from './SubscribeDTO';
import { err, ok, Result } from 'neverthrow';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { inject, injectable } from 'inversify';
import { IUserService } from '../../../core/domain/IUserService';
import { Subscriber } from '../../domain/subscription/Subscriber';
import { EventSourceId } from '../../domain/event/EventSourceId';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { SubscriberReference } from '../../domain/subscription/SubscriberReference';
import { PersistenceError } from './SubscribeError';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { TYPES } from '../../infrastructure/di/di-types';
import { MessageCreator } from '../../domain/notifier/MessageCreator';

export interface SubscriptionResult {
	subscribed: EventSourceIdDTO[];
	failed: FailedSubscription[];
}

export interface FailedSubscription {
	eventSourceId: EventSourceIdDTO;
	error: Error;
}

@injectable()
export class Subscribe {
	constructor(
		@inject(TYPES.MessageCreator) protected messageCreator: MessageCreator,
		protected eventSourceIdFactory: EventSourceIdFactory,
		@inject('SubscriberRepository')
		protected subscriberRepository: SubscriberRepository,
		@inject('UserService') protected userService: IUserService
	) {}

	async execute(
		subscribeDTO: SubscribeDTO
	): Promise<Result<SubscriptionResult, Error>> {
		try {
			const failedEventSourceIdDTOs: FailedSubscription[] = [];
			const subscribedEventSourceIdDTOs: EventSourceIdDTO[] = [];
			const eventSourceIds: EventSourceId[] = [];

			if (subscribeDTO.eventSourceIds.length === 0)
				return err(new Error('No event sources specified'));

			for (const eventSourceIdDTO of subscribeDTO.eventSourceIds) {
				const eventSourceIdResult = await this.eventSourceIdFactory.create(
					eventSourceIdDTO.type,
					eventSourceIdDTO.id,
					subscribeDTO.time
				);
				if (eventSourceIdResult.isErr()) {
					failedEventSourceIdDTOs.push({
						eventSourceId: eventSourceIdDTO,
						error: eventSourceIdResult.error
					});
				} else {
					subscribedEventSourceIdDTOs.push(eventSourceIdDTO);
					eventSourceIds.push(eventSourceIdResult.value);
				}
			}

			if (eventSourceIds.length === 0) {
				return ok({ subscribed: [], failed: failedEventSourceIdDTOs });
			}

			const userIdResult = await this.userService.findOrCreateUser(
				subscribeDTO.emailAddress
			);
			if (userIdResult.isErr()) return err(userIdResult.error);

			let subscriber = await this.subscriberRepository.findOneByUserId(
				userIdResult.value
			);
			if (subscriber === null)
				subscriber = Subscriber.create({
					userId: userIdResult.value,
					SubscriberReference: SubscriberReference.create(),
					registrationDate: subscribeDTO.time
				});

			const pendingSubscriptionId =
				this.subscriberRepository.nextPendingSubscriptionId();
			subscriber.addPendingSubscription(
				pendingSubscriptionId,
				eventSourceIds,
				subscribeDTO.time
			);
			await this.subscriberRepository.save([subscriber]);

			const message =
				await this.messageCreator.createConfirmSubscriptionMessage(
					pendingSubscriptionId
				);
			const result = await this.userService.send(subscriber.userId, message);

			if (result.isErr()) return err(result.error);

			return ok({
				subscribed: subscribedEventSourceIdDTOs,
				failed: failedEventSourceIdDTOs
			});
		} catch (e) {
			return err(new PersistenceError(mapUnknownToError(e)));
		}
	}
}
