import { EJSMessageCreator } from '../EJSMessageCreator';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { Notification } from '../../../domain/subscription/Notification';
import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	HistoryArchiveErrorDetectedEvent,
	NetworkLossOfLivenessEvent,
	NetworkLossOfSafetyEvent,
	NetworkNodeLivenessRiskEvent,
	NetworkNodeSafetyRiskEvent,
	NetworkOrganizationLivenessRiskEvent,
	NetworkOrganizationSafetyRiskEvent,
	NetworkTransitiveQuorumSetChangedEvent,
	NodeXUpdatesConnectivityErrorEvent,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesTomlErrorEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../domain/event/Event';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../../../domain/event/EventSourceId';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { ok, Result } from 'neverthrow';
import { EventSourceService } from '../../../domain/event/EventSourceService';
import { EventSource } from '../../../domain/event/EventSource';

it('should create confirm subscription message', async function () {
	const messageCreator = new EJSMessageCreator(
		'https://stellarbeat.io',
		{} as EventSourceService
	);
	const rawId = '76f18672-2fca-486e-a508-f0c2119c0798';
	const message = await messageCreator.createConfirmSubscriptionMessage(
		createDummyPendingSubscriptionId(rawId)
	);
	console.log(message.body);
	expect(message.title).toEqual('Confirm your subscription');
	expect(message.body).toContain(
		'https://stellarbeat.io/notify/76f18672-2fca-486e-a508-f0c2119c0798/confirm'
	);
});

it('should create notification message', async function () {
	const time = new Date();
	const subscriber = createDummySubscriber();
	const networkSourceId = new NetworkId('public');
	const nodeSourceIdResult = PublicKey.create(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	if (nodeSourceIdResult.isErr()) throw nodeSourceIdResult.error;
	const nodeSourceId = nodeSourceIdResult.value;
	const organizationSourceId = new OrganizationId(
		'266107f8966d45eedce41fee2581326d'
	);
	const eventSourceService: EventSourceService = {
		async findEventSource(
			eventSourceId: EventSourceId,
			time: Date = new Date()
		): Promise<Result<EventSource, Error>> {
			if (eventSourceId.equals(nodeSourceId))
				return Promise.resolve(ok(new EventSource(eventSourceId, 'Some node')));
			if (eventSourceId.equals(organizationSourceId))
				return Promise.resolve(
					ok(new EventSource(eventSourceId, 'Some organization'))
				);
			return Promise.resolve(
				ok(new EventSource(networkSourceId, 'A custom network'))
			);
		}
	} as EventSourceService;
	const messageCreator = new EJSMessageCreator(
		'https://stellarbeat.io',
		eventSourceService
	);
	const notification: Notification = {
		events: [
			new NetworkLossOfLivenessEvent(time, networkSourceId, { from: 5, to: 3 }),
			new NetworkLossOfSafetyEvent(time, networkSourceId, { from: 5, to: 3 }),
			new NetworkNodeSafetyRiskEvent(time, networkSourceId, { from: 5, to: 3 }),
			new NetworkOrganizationSafetyRiskEvent(time, networkSourceId, {
				from: 5,
				to: 3
			}),
			new NetworkNodeLivenessRiskEvent(time, networkSourceId, {
				from: 5,
				to: 3
			}),
			new NetworkOrganizationLivenessRiskEvent(time, networkSourceId, {
				from: 5,
				to: 3
			}),
			new NetworkTransitiveQuorumSetChangedEvent(time, networkSourceId, {
				from: ['deleted', 'a', 'b'],
				to: ['a', 'b', 'new', 'other newly added node']
			}),
			new NodeXUpdatesInactiveEvent(time, nodeSourceId, {
				numberOfUpdates: 3
			}),
			new NodeXUpdatesConnectivityErrorEvent(time, nodeSourceId, {
				numberOfUpdates: 3
			}),
			new ValidatorXUpdatesNotValidatingEvent(time, nodeSourceId, {
				numberOfUpdates: 3
			}),
			new FullValidatorXUpdatesHistoryArchiveOutOfDateEvent(
				time,
				nodeSourceId,
				{
					numberOfUpdates: 3
				}
			),
			new OrganizationXUpdatesUnavailableEvent(time, organizationSourceId, {
				numberOfUpdates: 3
			}),
			new OrganizationXUpdatesTomlErrorEvent(time, organizationSourceId, {
				numberOfUpdates: 3
			}),
			new HistoryArchiveErrorDetectedEvent(time, nodeSourceId, {})
		],
		subscriber: subscriber,
		time: new Date()
	};
	const message = await messageCreator.createNotificationMessage(notification);
	expect(message.body).toBeDefined();
	console.log(message.body);
});

it('should create unsubscribe message', async function () {
	const messageCreator = new EJSMessageCreator(
		'https://stellarbeat.io',
		{} as EventSourceService
	);
	const time = new Date();
	const subscriber = createDummySubscriber();
	const message = await messageCreator.createUnsubscribeMessage(
		subscriber.subscriberReference,
		time
	);
	console.log(message.body);
	expect(message.title).toEqual('Unsubscribe');
	expect(message.body).toContain(
		'https://stellarbeat.io/notify/' +
			subscriber.subscriberReference.value +
			'/unsubscribe?at=' +
			time.toISOString()
	);
});
