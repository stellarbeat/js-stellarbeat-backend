import { UnmuteNotificationDTO } from './UnmuteNotificationDTO';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { inject, injectable } from 'inversify';
import { ContactRepository } from '../../domain/contact/ContactRepository';
import { err, ok, Result } from 'neverthrow';
import { ContactPublicReference } from '../../domain/contact/ContactPublicReference';
import { EventType } from '../../domain/event/Event';
import isPartOfStringEnum from '../../../shared/utilities/TypeGuards';

@injectable()
export class UnmuteNotification {
	constructor(
		@inject('ContactRepository') protected contactRepository: ContactRepository,
		protected eventSourceIdFactory: EventSourceIdFactory
	) {}

	public async execute(
		dto: UnmuteNotificationDTO
	): Promise<Result<void, Error>> {
		const eventType = dto.eventType;
		if (!isPartOfStringEnum(eventType, EventType))
			return err(new Error('Invalid event type'));

		const contactRefResult = ContactPublicReference.createFromValue(
			dto.contactRef
		);
		if (contactRefResult.isErr()) return err(contactRefResult.error);

		const eventSourceIdResult = await this.eventSourceIdFactory.create(
			dto.eventSourceType,
			dto.eventSourceId,
			new Date()
		);
		if (eventSourceIdResult.isErr()) return err(eventSourceIdResult.error);

		const contact = await this.contactRepository.findOneByPublicReference(
			contactRefResult.value
		);
		if (contact === null) return err(new Error('Contact not found'));

		contact.unMuteNotificationFor(eventSourceIdResult.value, eventType);
		await this.contactRepository.save([contact]);

		return ok(undefined);
	}
}
