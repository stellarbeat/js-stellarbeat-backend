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

export abstract class Event<T extends EventData, U extends EventSourceId> {
	constructor(readonly time: Date, readonly sourceId: U, readonly data: T) {}

	get type() {
		return this.constructor.name;
	}
}

export class NodeXUpdatesInactiveEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {}

export class ValidatorXUpdatesNotValidatingEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {}

export class ValidatorLivenessRiskEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {}

export class FullValidatorXUpdatesHistoryArchiveOutOfDateEvent extends Event<
	MultipleUpdatesEventData,
	PublicKey
> {}

export class OrganizationXUpdatesUnavailableEvent extends Event<
	MultipleUpdatesEventData,
	OrganizationId
> {}

export class NetworkTransitiveQuorumSetChangedEvent extends Event<
	ChangeEventData,
	NetworkId
> {}

export class NetworkNodeLivenessRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {}

export class NetworkNodeSafetyRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {}

export class NetworkOrganizationLivenessRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {}

export class NetworkOrganizationSafetyRiskEvent extends Event<
	ChangeEventData,
	EventSourceId
> {}

export class NetworkLossOfLivenessEvent extends Event<
	ChangeEventData,
	EventSourceId
> {}

export class NetworkLossOfSafetyEvent extends Event<
	ChangeEventData,
	EventSourceId
> {}
