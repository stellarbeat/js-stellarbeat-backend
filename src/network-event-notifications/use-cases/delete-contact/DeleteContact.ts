import { inject, injectable } from 'inversify';
import { ContactRepository } from '../../domain/contact/ContactRepository';
import { DeleteContactDTO } from './DeleteContactDTO';
import { ContactPublicReference } from '../../domain/contact/ContactPublicReference';
import { err, ok, Result } from 'neverthrow';
import { Mailer } from '../../../shared/domain/Mailer';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';

@injectable()
export class DeleteContact {
	constructor(
		@inject('ContactRepository') protected contactRepository: ContactRepository,
		@inject('Mailer') protected mailer: Mailer,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: DeleteContactDTO): Promise<Result<void, Error>> {
		const contactRefResult = ContactPublicReference.createFromValue(
			dto.contactRef
		);
		if (contactRefResult.isErr()) return err(contactRefResult.error);

		const contact = await this.contactRepository.findOneByPublicReference(
			contactRefResult.value
		);
		if (contact === null)
			return err(new Error(`Contact not found ${dto.contactRef}`));

		const deleteContactResult = await this.mailer.deleteContact(
			contact.contactId
		);
		if (deleteContactResult.isErr()) {
			this.exceptionLogger.captureException(deleteContactResult.error);
			return err(deleteContactResult.error);
		}

		await this.contactRepository.remove(contact);

		return ok(undefined);
	}
}
