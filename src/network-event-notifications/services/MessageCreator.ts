import { injectable } from 'inversify';
import { PendingSubscriptionId } from '../domain/subscription/PendingSubscription';
import * as ejs from 'ejs';
import { Message } from '../../shared/domain/Message';
import 'reflect-metadata';
import { Notification } from '../domain/subscription/Notification';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../domain/event/EventSourceId';
import { Event, EventData, EventType } from '../domain/event/Event';
import { NetworkEventDetector } from '../domain/event/NetworkEventDetector';
import { SubscriberReference } from '../domain/subscription/SubscriberReference';

@injectable()
export class MessageCreator {
	protected eventDescriptions: Record<string, string> = {};
	constructor(protected frontendBaseUrl: string) {
		this.initEventDescriptions();
	}

	protected initEventDescriptions() {
		this.eventDescriptions[EventType.NetworkLossOfLiveness] =
			'Liveness risk detected';
		this.eventDescriptions[EventType.NetworkLossOfSafety] =
			'Safety risk detected';
		this.eventDescriptions[EventType.NetworkNodeLivenessRisk] =
			'Liveness risk: ' +
			NetworkEventDetector.NodeLivenessRiskThreshold +
			' or less nodes detected that could halt the network';
		this.eventDescriptions[EventType.NetworkOrganizationLivenessRisk] =
			'Liveness risk: ' +
			NetworkEventDetector.OrganizationLivenessRiskThreshold +
			' or less organizations detected that could halt the network';
		this.eventDescriptions[EventType.NetworkNodeSafetyRisk] =
			'Safety risk: ' +
			NetworkEventDetector.NodeSafetyRiskThreshold +
			' or less nodes detected that could endanger safety';
		this.eventDescriptions[EventType.NetworkOrganizationSafetyRisk] =
			'Safety risk: ' +
			NetworkEventDetector.OrganizationSafetyRiskThreshold +
			' organizations detected that could endanger safety';
		this.eventDescriptions[EventType.NetworkTransitiveQuorumSetChanged] =
			'Transitive quorumSet changed';
		this.eventDescriptions[EventType.NodeXUpdatesInactive] =
			'Inactive for 3 consecutive updates';
		this.eventDescriptions[EventType.ValidatorXUpdatesNotValidating] =
			'Not validating for 3 consecutive updates';
		this.eventDescriptions[
			EventType.FullValidatorXUpdatesHistoryArchiveOutOfDate
		] = 'History archives not up-to-date for 3 consecutive updates';
		this.eventDescriptions[EventType.OrganizationXUpdatesUnavailable] =
			'Majority of nodes in organization found not validating for 3 consecutive updates';
	}

	async createConfirmSubscriptionMessage(
		pendingSubscriptionId: PendingSubscriptionId
	) {
		const body = await ejs.renderFile(
			__dirname + '/../templates/confirm-subscription-notification.ejs',
			{
				confirmUrl: `${this.frontendBaseUrl}/notify/${pendingSubscriptionId.value}/confirm`
			}
		);

		return new Message(body, 'Confirm your Stellarbeat.io subscription');
	}

	async createNotificationMessage(notification: Notification) {
		const body = await ejs.renderFile(
			__dirname + '/../templates/notification.ejs',
			{
				networkEvents: notification.events
					.filter((event) => event.sourceId instanceof NetworkId)
					.map((event) =>
						this.mapEvent(event, notification.subscriber.subscriberReference)
					),
				nodeEvents: notification.events
					.filter((event) => event.sourceId instanceof PublicKey)
					.map((event) =>
						this.mapEvent(event, notification.subscriber.subscriberReference)
					),
				organizationEvents: notification.events
					.filter((event) => event.sourceId instanceof OrganizationId)
					.map((event) =>
						this.mapEvent(event, notification.subscriber.subscriberReference)
					)
			}
		);

		return new Message(body, 'Stellarbeat.io notification');
	}

	protected mapEvent(
		event: Event<EventData, EventSourceId>,
		subscriberReference: SubscriberReference
	) {
		let goToBaseUrl = this.frontendBaseUrl;
		if (event.sourceId instanceof PublicKey) {
			goToBaseUrl += '/nodes/' + event.sourceId.value;
		}
		if (event.sourceId instanceof OrganizationId)
			goToBaseUrl += '/organizations/' + event.sourceId.value;

		return {
			description: this.eventDescriptions[event.type],
			source: event.sourceId.value,
			liveLink: goToBaseUrl,
			timeTravelLink: goToBaseUrl + '?at=' + event.time.toISOString(),
			unmuteLink: `${this.frontendBaseUrl}/notify/${subscriberReference.value}/unmute?event-source-id=${event.sourceId.value}&event-source-type=${event.sourceId.constructor.name}&event-type=${event.type}`
		};
	}
}
