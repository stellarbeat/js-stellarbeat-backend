import { injectable } from 'inversify';
import NetworkReadRepository from '../../../network/repositories/NetworkReadRepository';
import { Result, err, ok } from 'neverthrow';
import { NotifyContactsDTO } from './NotifyContactsDTO';
import { EventDetector } from '../../domain/event/EventDetector';
import {
	InCompleteNetworkError,
	InCompletePreviousNetworkError,
	NetworkStatisticsIncompleteError,
	NoNetworkError,
	NoPreviousNetworkError,
	NotifyContactsError
} from './NotifyContactsError';
import { TypeOrmContactRepository } from '../../infrastructure/database/repositories/TypeOrmContactRepository';
import { Network } from '@stellarbeat/js-stellar-domain';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Logger } from '../../../shared/services/PinoLogger';
import { EmailNotifier } from '../../domain/notifier/EmailNotifier';
import { ContactNotification } from '../../domain/contact/Contact';

@injectable()
export class NotifyContacts {
	constructor(
		protected networkReadRepository: NetworkReadRepository,
		protected eventDetector: EventDetector,
		protected contactRepository: TypeOrmContactRepository,
		protected emailNotifier: EmailNotifier,
		protected logger: Logger,
		protected exceptionLogger: ExceptionLogger
	) {}

	async execute(
		notifyContactsDTO: NotifyContactsDTO
	): Promise<Result<void, NotifyContactsError>> {
		const networksOrError = await this.getLatestNetworks(
			notifyContactsDTO.networkUpdateTime
		);
		if (networksOrError.isErr()) return err(networksOrError.error);
		const { network, previousNetwork } = networksOrError.value;

		const eventsOrError = await this.eventDetector.detect(
			network,
			previousNetwork
		);
		if (eventsOrError.isErr())
			return err(
				new NetworkStatisticsIncompleteError(
					notifyContactsDTO.networkUpdateTime,
					eventsOrError.error
				)
			);
		const events = eventsOrError.value;

		const contacts = await this.contactRepository.find();
		const contactNotifications = contacts
			.map((contact) => contact.publishNotificationAbout(events))
			.filter((notification) => notification !== null) as ContactNotification[];
		const mailResult = await this.emailNotifier.sendContactNotifications(
			contactNotifications
		);

		await this.contactRepository.save(
			mailResult.successfulNotifications.map(
				(notification) => notification.contact
			)
		); //cascading save
		console.log(mailResult.failedNotifications); //todo exceptionlogger

		return ok(undefined);
	}

	protected async getLatestNetworks(
		networkUpdateTime: Date
	): Promise<
		Result<{ network: Network; previousNetwork: Network }, NotifyContactsError>
	> {
		const networkOrError = await this.networkReadRepository.getNetwork(
			networkUpdateTime
		);
		if (networkOrError.isErr()) {
			return err(new InCompleteNetworkError(networkUpdateTime));
		}
		if (networkOrError.value === null)
			return err(new NoNetworkError(networkUpdateTime));

		const previousNetworkOrError =
			await this.networkReadRepository.getPreviousNetwork(networkUpdateTime);
		if (previousNetworkOrError.isErr()) {
			return err(new InCompletePreviousNetworkError(networkUpdateTime));
		}
		if (previousNetworkOrError.value === null)
			return err(new NoPreviousNetworkError(networkUpdateTime));

		return ok({
			network: networkOrError.value,
			previousNetwork: previousNetworkOrError.value
		});
	}
}
