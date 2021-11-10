import { inject } from 'inversify';
import { ContactRepository } from '../../domain/contact/ContactRepository';
import { DeleteContactDTO } from './DeleteContactDTO';
import { ContactPublicReference } from '../../domain/contact/ContactPublicReference';
import { err, ok, Result } from 'neverthrow';

export class DeleteContact {
	constructor(
		@inject('ContactRepository') protected contactRepository: ContactRepository
	) {}

	async execute(dto: DeleteContactDTO): Promise<Result<void, Error>> {
		const contact = await this.contactRepository.findOneByPublicReference(
			ContactPublicReference.create(dto.contactRef)
		);
		if (contact === null)
			return err(new Error(`Contact not found ${dto.contactRef}`));

		await this.contactRepository.remove(contact);

		return ok(undefined);
	}
}
