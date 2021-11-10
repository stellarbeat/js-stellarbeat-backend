import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from './EventSourceId';

export type EventData = Record<string, unknown>;

export interface ChangeEventData extends EventData {
	from: unknown;
	to: unknown;
}

export interface MultipleUpdatesEventData extends EventData {
	numberOfUpdates: number;
}

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

export abstract class Event<T extends EventData, U extends EventSourceId> {
	constructor(readonly time: Date, readonly sourceId: U, readonly data: T) {}

	abstract get type(): EventType;
}

export class NodeXUpdatesInactiveEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {
	get type(): EventType {
		return EventType.NodeXUpdatesInactive;
	}
}

export class ValidatorXUpdatesNotValidatingEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {
	get type(): EventType {
		return EventType.ValidatorXUpdatesNotValidating;
	}
}

export class ValidatorLivenessRiskEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {
	get type(): EventType {
		return EventType.ValidatorLivenessRisk;
	}
}

export class FullValidatorXUpdatesHistoryArchiveOutOfDateEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {
	get type(): EventType {
		return EventType.FullValidatorXUpdatesHistoryArchiveOutOfDate;
	}
}

export class OrganizationXUpdatesUnavailableEvent extends Event<
	MultipleUpdatesEventData,
	OrganizationId
> {
	get type(): EventType {
		return EventType.OrganizationXUpdatesUnavailable;
	}
}

export class NetworkTransitiveQuorumSetChangedEvent extends Event<
	ChangeEventData,
	NetworkId
> {
	get type(): EventType {
		return EventType.NetworkTransitiveQuorumSetChanged;
	}
}

export class NetworkNodeLivenessRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {
	get type(): EventType {
		return EventType.NetworkNodeLivenessRisk;
	}
}

export class NetworkNodeSafetyRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {
	get type(): EventType {
		return EventType.NetworkNodeSafetyRisk;
	}
}

export class NetworkOrganizationLivenessRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {
	get type(): EventType {
		return EventType.NetworkOrganizationLivenessRisk;
	}
}

export class NetworkOrganizationSafetyRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {
	get type(): EventType {
		return EventType.NetworkOrganizationSafetyRisk;
	}
}

export class NetworkLossOfLivenessEvent extends Event<
	ChangeEventData,
	EventSourceId
> {
	get type(): EventType {
		return EventType.NetworkLossOfLiveness;
	}
}

export class NetworkLossOfSafetyEvent extends Event<
	ChangeEventData,
	EventSourceId
> {
	get type(): EventType {
		return EventType.NetworkLossOfSafety;
	}
}
