import { EventSourceIdDTO, SubscribeDTO } from './SubscribeDTO';
import { err, ok, Result } from 'neverthrow';
import { ContactRepository } from '../../domain/contact/ContactRepository';
import { inject, injectable } from 'inversify';
import { Mailer } from '../../../shared/domain/Mailer';
import { Contact } from '../../domain/contact/Contact';
import { EventSourceId } from '../../domain/event/EventSourceId';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { createContactDummy } from '../../domain/contact/__fixtures__/Contact.fixtures';
import { ContactPublicReference } from '../../domain/contact/ContactPublicReference';

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
		@inject('ContactRepository') protected contactRepository: ContactRepository,
		@inject('Mailer') protected mailer: Mailer
	) {}

	async execute(
		subscribeDTO: SubscribeDTO
	): Promise<Result<SubscriptionResult, Error>> {
		const failedEventSourceIdDTOs: FailedSubscription[] = [];
		const subscribedEventSourceIdDTOs: EventSourceIdDTO[] = [];
		const eventSourceIds: EventSourceId[] = [];

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

		const contactIdResult = await this.mailer.findOrCreateContact(
			subscribeDTO.emailAddress
		);
		if (contactIdResult.isErr()) return err(contactIdResult.error);

		const contact = Contact.create({
			contactId: contactIdResult.value,
			publicReference: ContactPublicReference.create()
		});

		contact.addPendingSubscription(
			this.contactRepository.nextPendingEventSourceIdentity(),
			eventSourceIds,
			subscribeDTO.time
		);
		await this.contactRepository.save([contact]);

		const mailResult = await this.mailer.send(
			'confirm yes?',
			'confirm yes?',
			contact.contactId
		);

		if (mailResult.isErr()) return err(mailResult.error);

		return ok({
			subscribed: subscribedEventSourceIdDTOs,
			failed: failedEventSourceIdDTOs
		});
	}
}
