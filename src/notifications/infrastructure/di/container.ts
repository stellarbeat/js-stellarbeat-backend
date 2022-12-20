import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { TYPES } from './di-types';
import { NETWORK_TYPES as NETWORK_TYPES } from '../../../network/infrastructure/di/di-types';
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
import { IUserService } from '../../../core/domain/IUserService';
import { UserService } from '../../../core/services/UserService';
import { Notify } from '../../use-cases/determine-events-and-notify-subscribers/Notify';
import { UnmuteNotification } from '../../use-cases/unmute-notification/UnmuteNotification';
import { Subscribe } from '../../use-cases/subscribe/Subscribe';
import { Unsubscribe } from '../../use-cases/unsubscribe/Unsubscribe';
import { ConfirmSubscription } from '../../use-cases/confirm-subscription/ConfirmSubscription';
import { CORE_TYPES as CORE_TYPES } from '../../../core/infrastructure/di/di-types';
import { Config } from '../../../core/config/Config';
import { EventRepository } from '../../domain/event/EventRepository';
import { TypeOrmEventRepository } from '../database/repositories/TypeOrmEventRepository';
import { NodeMeasurementRepository } from '../../../network/domain/measurement/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../../network/domain/measurement/OrganizationMeasurementRepository';

export function load(container: Container, config: Config) {
	container.bind(EventDetector).toSelf();
	container.bind(NodeEventDetector).toSelf();
	container.bind(NetworkEventDetector).toSelf();
	container.bind(Notifier).toSelf();
	container
		.bind<EventSourceService>('EventSourceService')
		.toDynamicValue(() => {
			return new EventSourceFromNetworkService(
				container.get<NetworkReadRepository>(CORE_TYPES.NetworkReadRepository)
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
	container.bind<EventRepository>('EventRepository').toDynamicValue(() => {
		return new TypeOrmEventRepository(
			container.get<NodeMeasurementRepository>(
				NETWORK_TYPES.NodeMeasurementRepository
			),
			container.get<OrganizationMeasurementRepository>(
				NETWORK_TYPES.OrganizationMeasurementRepository
			)
		);
	});
}
