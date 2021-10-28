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
import { CustomError } from '../../../shared/errors/CustomError';
import { EventNotifier } from '../../domain/event-subscription/EventNotifier';
import { Event, EventData } from '../../domain/event/Event';

@injectable()
export class NotifyContacts {
	constructor(
		protected networkReadRepository: NetworkReadRepository,
		protected eventDetector: EventDetector,
		protected contactRepository: TypeOrmContactRepository,
		protected eventNotifier: EventNotifier,
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
		contacts.forEach((contact) => {
			try {
				contact.notifyIfSubscribed(events);
				this.contactRepository.save(contact);
				const notificationsToBeSent = contact.getNotificationsAt(network.time);

				const eventsToBeSent = notificationsToBeSent
					.map((notification) =>
						events.find(
							(event) =>
								event.type === notification.eventType &&
								event.source.id === notification.eventSourceId &&
								event.source.type === notification.eventSourceType
						)
					)
					.filter((event) => event !== undefined) as Event<EventData>[];

				this.eventNotifier.notify(contact, eventsToBeSent);
			} catch (e: unknown) {
				//todo better handling
				let error: Error;
				if (!(e instanceof Error))
					error = new Error(
						`Failed notifying contact ${contact.contactId.value} with message ${e}`
					);
				else
					error = new CustomError(
						`Failed notifying contact ${contact.contactId.value}`,
						'ContactNotifyError',
						e
					);
				this.exceptionLogger.captureException(error);
				this.logger.error(error.message);
			}
		});

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
