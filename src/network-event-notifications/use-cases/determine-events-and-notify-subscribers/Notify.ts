import { inject, injectable } from 'inversify';
import NetworkReadRepository from '../../../network/repositories/NetworkReadRepository';
import { Result, err, ok } from 'neverthrow';
import { NotifyDTO } from './NotifyDTO';
import { EventDetector } from '../../domain/event/EventDetector';
import {
	InCompleteNetworkError,
	InCompletePreviousNetworkError,
	NetworkStatisticsIncompleteError,
	NoNetworkError,
	NoPreviousNetworkError,
	NotifyError
} from './NotifyError';
import { Network } from '@stellarbeat/js-stellar-domain';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Logger } from '../../../shared/services/PinoLogger';
import { Notifier } from '../../domain/notifier/Notifier';
import { Notification } from '../../domain/subscription/Subscriber';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';

@injectable()
export class Notify {
	constructor(
		protected networkReadRepository: NetworkReadRepository,
		protected eventDetector: EventDetector,
		@inject('SubscriberRepository')
		protected SubscriberRepository: SubscriberRepository,
		protected notifier: Notifier,
		@inject('Logger') protected logger: Logger,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async execute(notifyDTO: NotifyDTO): Promise<Result<void, NotifyError>> {
		const networksOrError = await this.getLatestNetworks(
			notifyDTO.networkUpdateTime
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
					notifyDTO.networkUpdateTime,
					eventsOrError.error
				)
			);
		const events = eventsOrError.value;
		if (events.length === 0) {
			this.logger.info('No network events detected');
			return ok(undefined);
		}

		this.logger.info('Detected events', { events: events });
		const subscribers = await this.SubscriberRepository.find();
		const notifications = subscribers
			.map((subscriber) => subscriber.publishNotificationAbout(events))
			.filter((notification) => notification !== null) as Notification[];
		if (notifications.length === 0) return ok(undefined);

		const result = await this.notifier.sendNotifications(notifications);

		await this.SubscriberRepository.save(
			result.successfulNotifications.map(
				(notification) => notification.subscriber
			)
		); //cascading save
		console.log(result.failedNotifications); //todo exceptionlogger

		return ok(undefined);
	}

	protected async getLatestNetworks(
		networkUpdateTime: Date
	): Promise<
		Result<{ network: Network; previousNetwork: Network }, NotifyError>
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
