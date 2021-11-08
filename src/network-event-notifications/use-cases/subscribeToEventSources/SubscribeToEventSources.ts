import { SubscribeToEventSourcesDTO } from './SubscribeToEventSourcesDTO';
import { Contact } from '../../domain/contact/Contact';
import { ContactRepository } from '../../domain/contact/ContactRepository';
import { injectable } from 'inversify';

@injectable()
export class SubscribeToEventSources {
	constructor(protected contactRepository: ContactRepository) {}
	execute(subscribeToEventsDTO: SubscribeToEventSourcesDTO) {
		const contact = this.contactRepository.findOneByMailHash(
			subscribeToEventsDTO.emailAddress
		);
		//const contact = Contact.create({});
	}
}
