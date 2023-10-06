import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { TYPES } from './di-types';
import { NETWORK_TYPES as NETWORK_TYPES } from '../../../network-scan/infrastructure/di/di-types';
import { MessageCreator } from '../../domain/notifier/MessageCreator';
import { EJSMessageCreator } from '../services/EJSMessageCreator';
import { EventDetector } from '../../domain/event/EventDetector';
import { NodeEventDetector } from '../../domain/event/NodeEventDetector';
import { NetworkEventDetector } from '../../domain/event/NetworkEventDetector';
import { Notifier } from '../../domain/notifier/Notifier';
import { EventSourceService } from '../../domain/event/EventSourceService';
import { EventSourceFromNetworkService } from '../services/EventSourceFromNetworkService';
import { EventSourceIdFactory } from '../../domain/event/EventSourceIdFactory';
import { IUserService } from '../../../core/domain/IUserService';
import { UserService } from '../../../core/services/UserService';
import { Notify } from '../../use-cases/determine-events-and-notify-subscribers/Notify';
import { UnmuteNotification } from '../../use-cases/unmute-notification/UnmuteNotification';
import { Subscribe } from '../../use-cases/subscribe/Subscribe';
import { Unsubscribe } from '../../use-cases/unsubscribe/Unsubscribe';
import { ConfirmSubscription } from '../../use-cases/confirm-subscription/ConfirmSubscription';
import { Config } from '../../../core/config/Config';
import { EventRepository } from '../../domain/event/EventRepository';
import { TypeOrmEventRepository } from '../database/repositories/TypeOrmEventRepository';
import { NodeMeasurementRepository } from '../../../network-scan/domain/node/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../../network-scan/domain/organization/OrganizationMeasurementRepository';
import { NetworkDTOService } from '../../../network-scan/services/NetworkDTOService';
import { DataSource } from 'typeorm';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { TypeOrmSubscriberRepository } from '../database/repositories/TypeOrmSubscriberRepository';
import { Subscriber } from '../../domain/subscription/Subscriber';
import { RequestUnsubscribeLink } from '../../use-cases/request-unsubscribe-link/RequestUnsubscribeLink';

export function load(container: Container, config: Config) {
	const dataSource = container.get(DataSource);
	container.bind(EventDetector).toSelf();
	container.bind(NodeEventDetector).toSelf();
	container.bind(NetworkEventDetector).toSelf();
	container.bind(Notifier).toSelf();
	container
		.bind<SubscriberRepository>('SubscriberRepository')
		.toDynamicValue(() => {
			return new TypeOrmSubscriberRepository(
				dataSource.getRepository(Subscriber)
			);
		})
		.inRequestScope();
	container
		.bind<EventSourceService>(TYPES.EventSourceService)
		.toDynamicValue(() => {
			return new EventSourceFromNetworkService(
				container.get(NetworkDTOService)
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
	container.bind(RequestUnsubscribeLink).toSelf();
	container
		.bind<MessageCreator>(TYPES.MessageCreator)
		.toDynamicValue(() => {
			if (!config.frontendBaseUrl) {
				throw new Error('FRONTEND_BASE_URL not defined');
			}
			return new EJSMessageCreator(
				config.frontendBaseUrl,
				container.get(TYPES.EventSourceService)
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
