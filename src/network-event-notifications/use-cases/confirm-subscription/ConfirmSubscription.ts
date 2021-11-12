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
		const pendingSubscriptionIdResult = PendingSubscriptionId.create(
			dto.pendingSubscriptionId
		);
		if (pendingSubscriptionIdResult.isErr())
			return err(pendingSubscriptionIdResult.error);

		const contact = await this.contactRepository.findOneByPendingSubscriptionId(
			pendingSubscriptionIdResult.value
		);
		if (contact === null)
			return err(
				new Error(
					`Contact not found for subscription ${dto.pendingSubscriptionId}`
				)
			);

		const result = contact.confirmPendingSubscription(
			pendingSubscriptionIdResult.value
		);
		if (result.isErr()) return err(result.error);

		await this.contactRepository.save([contact]);

		return ok(undefined);
	}
}
