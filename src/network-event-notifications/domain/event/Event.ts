import {
	EventSource,
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from '../contact/EventSource';

export enum EventType {
	NodeXUpdatesInactive = 'NodeXUpdatesInactive',
	ValidatorXUpdatesNotValidating = 'ValidatorXUpdatesNotValidating',
	ValidatorLivenessRisk = 'ValidatorLivenessRisk',
	FullValidatorXUpdatesHistoryArchiveOutOfDate = 'FullValidatorXUpdatesHistoryArchiveOutOfDate',
	OrganizationXUpdatesUnavailable = 'OrganizationXUpdatesUnavailable',
	NetworkTransitiveQuorumSetChanged = 'NetworkTransitiveQuorumSetChanged',
	NetworkNodeLivenessRisk = 'NetworkNodeLivenessRisk',
	NetworkNodeSafetyRisk = 'NetworkNodeSafetyRisk',
	NetworkOrganizationLivenessRisk = 'NetworkOrganizationLivenessRisk',
	NetworkOrganizationSafetyRisk = 'NetworkOrganizationSafetyRisk',
	NetworkLossOfLiveness = 'NetworkLossOfLiveness',
	NetworkLossOfSafety = 'NetworkLossOfSafety'
}

export enum SourceType {
	'Node' = 'Node',
	'Organization' = 'Organization',
	'Network' = 'Network'
}

export type EventData = Record<string, unknown>;

export interface ChangeEventData extends EventData {
	from: unknown;
	to: unknown;
}

export interface MultipleUpdatesEventData extends EventData {
	numberOfUpdates: number;
}

export abstract class Event<
	T extends EventData,
	U extends EventSource<EventSourceId>
> {
	constructor(readonly time: Date, readonly source: U, readonly data: T) {}
}

export class NodeXUpdatesInactiveEvent extends Event<
	MultipleUpdatesEventData,
	EventSource<PublicKey>
> {}

export class ValidatorXUpdatesNotValidatingEvent extends Event<
	MultipleUpdatesEventData,
	EventSource<PublicKey>
> {}

export class ValidatorLivenessRiskEvent extends Event<
	MultipleUpdatesEventData,
	EventSource<PublicKey>
> {}

export class FullValidatorXUpdatesHistoryArchiveOutOfDateEvent extends Event<
	MultipleUpdatesEventData,
	EventSource<PublicKey>
> {}

export class OrganizationXUpdatesUnavailableEvent extends Event<
	MultipleUpdatesEventData,
	EventSource<OrganizationId>
> {}

export class NetworkTransitiveQuorumSetChangedEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}

export class NetworkNodeLivenessRiskEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}

export class NetworkNodeSafetyRiskEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}

export class NetworkOrganizationLivenessRiskEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}

export class NetworkOrganizationSafetyRiskEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}

export class NetworkLossOfLivenessEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}

export class NetworkLossOfSafetyEvent extends Event<
	ChangeEventData,
	EventSource<NetworkId>
> {}
