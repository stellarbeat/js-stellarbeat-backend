import { inject, injectable } from 'inversify';
import { ConfirmSubscriptionDTO } from './ConfirmSubscriptionDTO';
import { err, ok, Result } from 'neverthrow';
import { ContactPublicReference } from '../../domain/contact/ContactPublicReference';
import { ContactRepository } from '../../domain/contact/ContactRepository';
import { PendingSubscriptionId } from '../../domain/contact/PendingSubscription';

@injectable()
export class ConfirmSubscription {
	constructor(
		@inject('ContactRepository') protected contactRepository: ContactRepository
	) {}

	async execute(dto: ConfirmSubscriptionDTO): Promise<Result<void, Error>> {
		const contactRefResult = ContactPublicReference.createFromValue(
			dto.contactRef
		);
		if (contactRefResult.isErr()) return err(contactRefResult.error);

		const pendingSubscriptionIdResult = PendingSubscriptionId.create(
			dto.pendingSubscriptionId
		);
		if (pendingSubscriptionIdResult.isErr())
			return err(pendingSubscriptionIdResult.error);

		const contact = await this.contactRepository.findOneByPublicReference(
			contactRefResult.value
		);
		if (contact === null)
			return err(new Error(`Contact not found ${dto.contactRef}`));

		const result = contact.confirmPendingSubscription(
			pendingSubscriptionIdResult.value
		);
		if (result.isErr()) return err(result.error);

		await this.contactRepository.save([contact]);

		return ok(undefined);
	}
}
