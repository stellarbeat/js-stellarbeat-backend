import { inject, injectable } from 'inversify';
import { PendingSubscriptionId } from '../../domain/subscription/PendingSubscription';
import * as ejs from 'ejs';
import { Message } from '../../../core/domain/Message';
import 'reflect-metadata';
import { Notification } from '../../domain/subscription/Notification';
import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../../domain/event/EventSourceId';
import {
	Event,
	EventData,
	EventType,
	NetworkTransitiveQuorumSetChangedEvent
} from '../../domain/event/Event';
import { NetworkEventDetector } from '../../domain/event/NetworkEventDetector';
import { SubscriberReference } from '../../domain/subscription/SubscriberReference';
import { EventSourceService } from '../../domain/event/EventSourceService';
import { EventSource } from '../../domain/event/EventSource';
import { MessageCreator } from '../../domain/notifier/MessageCreator';

@injectable()
export class EJSMessageCreator implements MessageCreator {
	protected eventDescriptions: Record<string, string> = {};
	constructor(
		protected frontendBaseUrl: string,
		@inject('EventSourceService')
		protected eventSourceService: EventSourceService
	) {
		this.initEventDescriptions();
	}

	protected initEventDescriptions() {
		this.eventDescriptions[EventType.HistoryArchiveErrorDetected] =
			'Error in history archive detected';
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
			'Node inactive for 3 consecutive updates';
		this.eventDescriptions[EventType.NodeXUpdatesConnectivityError] =
			'Could not connect to node for 3 consecutive updates';
		this.eventDescriptions[EventType.NodeXUpdatesStellarCoreBehind] =
			'Node not running latest stellar-core version';
		this.eventDescriptions[EventType.ValidatorXUpdatesNotValidating] =
			'Node not validating for 3 consecutive updates';
		this.eventDescriptions[
			EventType.FullValidatorXUpdatesHistoryArchiveOutOfDate
		] = 'History archive not up-to-date for 3 consecutive updates';
		this.eventDescriptions[EventType.OrganizationXUpdatesUnavailable] =
			'Majority of nodes in organization not validating for 3 consecutive updates';
		this.eventDescriptions[EventType.OrganizationXUpdatesTomlError] =
			'Issue with organization toml file detected';
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

		return new Message(body, 'Confirm your subscription');
	}

	async createUnsubscribeMessage(
		subscriberReference: SubscriberReference,
		time: Date
	) {
		const body = await ejs.renderFile(
			__dirname + '/../templates/unsubscribe-notification.ejs',
			{
				unsubscribeUrl:
					this.frontendBaseUrl +
					'/notify/' +
					subscriberReference.value +
					'/unsubscribe?at=' +
					time.toISOString()
			}
		);

		return new Message(body, 'Unsubscribe');
	}

	async createNotificationMessage(notification: Notification) {
		const eventSources: Map<EventSourceId, EventSource> = new Map<
			EventSourceId,
			EventSource
		>();
		await Promise.all(
			notification.events.map(async (event) => {
				const source = await this.eventSourceService.findEventSource(
					event.sourceId,
					notification.time
				);
				if (source.isErr())
					eventSources.set(
						event.sourceId,
						new EventSource(event.sourceId, event.sourceId.value)
					);
				else eventSources.set(event.sourceId, source.value);
			})
		);
		const body = await ejs.renderFile(
			__dirname + '/../templates/notification.ejs',
			{
				networkEvents: notification.events
					.filter((event) => event.sourceId instanceof NetworkId)
					.map((event) =>
						this.mapEvent(
							event,
							notification.subscriber.subscriberReference,
							eventSources
						)
					),
				nodeEvents: notification.events
					.filter((event) => event.sourceId instanceof PublicKey)
					.map((event) =>
						this.mapEvent(
							event,
							notification.subscriber.subscriberReference,
							eventSources
						)
					),
				organizationEvents: notification.events
					.filter((event) => event.sourceId instanceof OrganizationId)
					.map((event) =>
						this.mapEvent(
							event,
							notification.subscriber.subscriberReference,
							eventSources
						)
					),
				unsubscribeLink:
					this.frontendBaseUrl +
					'/notify/' +
					notification.subscriber.subscriberReference.value +
					'/unsubscribe',
				time: notification.time.toUTCString()
			}
		);

		return new Message(
			body,
			'Event(s) detected at ' + notification.time.toUTCString()
		);
	}

	protected mapEvent(
		event: Event<EventData, EventSourceId>,
		subscriberReference: SubscriberReference,
		eventSources: Map<EventSourceId, EventSource>
	) {
		let goToBaseUrl = this.frontendBaseUrl;
		if (event.sourceId instanceof PublicKey) {
			goToBaseUrl += '/nodes/' + event.sourceId.value;
		}
		if (event.sourceId instanceof OrganizationId)
			goToBaseUrl += '/organizations/' + event.sourceId.value;

		let eventSourceType = 'network';
		if (event.sourceId instanceof PublicKey) eventSourceType = 'node';
		if (event.sourceId instanceof OrganizationId)
			eventSourceType = 'organization';

		let displayChangeMessage = false;
		let changeMessage: string | null = null;
		if (event instanceof NetworkTransitiveQuorumSetChangedEvent) {
			displayChangeMessage = true;
			changeMessage = 'Nodes changed';
		}
		return {
			description: this.eventDescriptions[event.type]
				? this.eventDescriptions[event.type]
				: event.type,
			source: eventSources.get(event.sourceId)?.name,
			liveLink: goToBaseUrl,
			timeTravelLink: goToBaseUrl + '?at=' + event.time.toISOString(),
			unmuteLink: `${this.frontendBaseUrl}/notify/${subscriberReference.value}/unmute?event-source-id=${event.sourceId.value}&event-source-type=${eventSourceType}&event-type=${event.type}`,
			data: event.data,
			displayChangeMessage: displayChangeMessage,
			changeMessage: changeMessage
		};
	}
}
