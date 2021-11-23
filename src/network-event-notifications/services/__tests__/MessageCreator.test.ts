import { MessageCreator } from '../MessageCreator';
import { createDummyPendingSubscriptionId } from '../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { Notification } from '../../domain/subscription/Notification';
import {
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	NetworkLossOfLivenessEvent,
	NetworkLossOfSafetyEvent,
	NetworkNodeLivenessRiskEvent,
	NetworkNodeSafetyRiskEvent,
	NetworkOrganizationLivenessRiskEvent,
	NetworkOrganizationSafetyRiskEvent,
	NetworkTransitiveQuorumSetChangedEvent,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../domain/event/Event';
import {
	NetworkId,
	OrganizationId,
	PublicKey
} from '../../domain/event/EventSourceId';
import { createDummySubscriber } from '../../domain/subscription/__fixtures__/Subscriber.fixtures';

it('should create confirm subscription message', async function () {
	const messageCreator = new MessageCreator('https://stellarbeat.io');
	const rawId = '76f18672-2fca-486e-a508-f0c2119c0798';
	const message = await messageCreator.createConfirmSubscriptionMessage(
		createDummyPendingSubscriptionId(rawId)
	);
	expect(message.title).toEqual('Confirm your Stellarbeat.io subscription');
	expect(message.body).toEqual(
		'<h3><a href="https://stellarbeat.io/notify/76f18672-2fca-486e-a508-f0c2119c0798/confirm">Click here to confirm your subscription</a></h3>'
	);
});

it('should create notification message', async function () {
	const messageCreator = new MessageCreator('https://stellarbeat.io');
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
				from: 'a',
				to: 'b'
			}),
			new NodeXUpdatesInactiveEvent(time, nodeSourceId, {
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
			})
		],
		subscriber: subscriber
	};
	const message = await messageCreator.createNotificationMessage(notification);
	console.log(message.body);
});
