import { EventSourceIdDTO, SubscribeDTO } from './SubscribeDTO';
import { err, ok, Result } from 'neverthrow';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { inject, injectable } from 'inversify';
import { IUserService } from '../../../shared/domain/IUserService';
import { Subscriber } from '../../domain/subscription/Subscriber';
import { EventSourceId } from '../../domain/event/EventSourceId';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { SubscriberReference } from '../../domain/subscription/SubscriberReference';
import { Message } from '../../../shared/domain/Message';

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
		protected eventSourceIdFactory: EventSourceIdFactory,
		@inject('SubscriberRepository')
		protected SubscriberRepository: SubscriberRepository,
		@inject('UserService') protected userService: IUserService
	) {}

	async execute(
		subscribeDTO: SubscribeDTO
	): Promise<Result<SubscriptionResult, Error>> {
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

		const subscriber = Subscriber.create({
			userId: userIdResult.value,
			SubscriberReference: SubscriberReference.create()
		});

		subscriber.addPendingSubscription(
			this.SubscriberRepository.nextPendingSubscriptionId(),
			eventSourceIds,
			subscribeDTO.time
		);
		await this.SubscriberRepository.save([subscriber]);

		const result = await this.userService.send(
			subscriber.userId,
			new Message('confirm yes?', 'confirm yes?')
		);

		if (result.isErr()) return err(result.error);

		return ok({
			subscribed: subscribedEventSourceIdDTOs,
			failed: failedEventSourceIdDTOs
		});
	}
}
