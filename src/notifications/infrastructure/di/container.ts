import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { TYPES } from './di-types';
import { MessageCreator } from '../../domain/notifier/MessageCreator';
import { EJSMessageCreator } from '../services/EJSMessageCreator';
import { EventDetector } from '../../domain/event/EventDetector';
import { NodeEventDetector } from '../../domain/event/NodeEventDetector';
import { NetworkEventDetector } from '../../domain/event/NetworkEventDetector';
import { Notifier } from '../../domain/notifier/Notifier';
import { EventSourceService } from '../../domain/event/EventSourceService';
import { EventSourceFromNetworkService } from '../services/EventSourceFromNetworkService';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { IUserService } from '../../../shared/domain/IUserService';
import { UserService } from '../../../shared/services/UserService';
import { Notify } from '../../use-cases/determine-events-and-notify-subscribers/Notify';
import { UnmuteNotification } from '../../use-cases/unmute-notification/UnmuteNotification';
import { Subscribe } from '../../use-cases/subscribe/Subscribe';
import { Unsubscribe } from '../../use-cases/unsubscribe/Unsubscribe';
import { ConfirmSubscription } from '../../use-cases/confirm-subscription/ConfirmSubscription';
import { TYPES as SHARED_TYPES } from '../../../shared/core/di-types';
import { Config } from '../../../shared/config/Config';

export function load(container: Container, config: Config) {
	container.bind(EventDetector).toSelf();
	container.bind(NodeEventDetector).toSelf();
	container.bind(NetworkEventDetector).toSelf();
	container.bind(Notifier).toSelf();
	container
		.bind<EventSourceService>('EventSourceService')
		.toDynamicValue(() => {
			return new EventSourceFromNetworkService(
				container.get<NetworkReadRepository>(SHARED_TYPES.NetworkReadRepository)
			);
		});
	container.bind(EventSourceIdFactory).toSelf();
	container.bind<IUserService>('UserService').toDynamicValue(() => {
		if (
			!config.userServiceUsername ||
			!config.userServiceBaseUrl ||
			!config.userServicePassword
		)
			throw new Error('invalid notification config');
		return new UserService(
			config.userServiceBaseUrl,
			config.userServiceUsername,
			config.userServicePassword,
			container.get('HttpService')
		);
	});
	container.bind(Notify).toSelf();
	container.bind(UnmuteNotification).toSelf();
	container.bind(Subscribe).toSelf();
	container.bind(Unsubscribe).toSelf();
	container.bind(ConfirmSubscription).toSelf();
	container
		.bind<MessageCreator>(TYPES.MessageCreator)
		.toDynamicValue(() => {
			if (!config.frontendBaseUrl) {
				throw new Error('FRONTEND_BASE_URL not defined');
			}
			return new EJSMessageCreator(
				config.frontendBaseUrl,
				container.get('EventSourceService')
			);
		})
		.inRequestScope();
}
