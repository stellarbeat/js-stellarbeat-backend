export enum EventType {
	NodeXUpdatesInactive,
	ValidatorXUpdatesNotValidating,
	ValidatorLivenessRisk,
	FullValidatorXUpdatesHistoryArchiveOutOfDate,
	OrganizationXUpdatesUnavailable,
	NetworkTransitiveQuorumSetChanged,
	NetworkNodeLivenessRisk,
	NetworkNodeSafetyRisk,
	NetworkOrganizationLivenessRisk,
	NetworkOrganizationSafetyRisk,
	NetworkLossOfLiveness,
	NetworkLossOfSafety
}

export enum SourceType {
	'Node',
	'Organization',
	'Network'
}

export type EventData = Record<string, unknown>;

export interface ChangeEventData extends EventData {
	from: unknown;
	to: unknown;
}

export interface MultipleUpdatesEventData extends EventData {
	numberOfUpdates: number;
}

export abstract class Event<T extends EventData> {
	protected constructor(
		readonly time: Date,
		readonly type: EventType,
		readonly source: {
			type: SourceType;
			id: string;
		},
		readonly data: T
	) {
		this.time = time;
		this.source = source;
		this.data = data;
	}
}

export class NodeXUpdatesInactiveEvent extends Event<MultipleUpdatesEventData> {
	constructor(time: Date, publicKey: string, data: MultipleUpdatesEventData) {
		super(
			time,
			EventType.NodeXUpdatesInactive,
			{ type: SourceType.Node, id: publicKey },
			data
		);
	}
}

export class ValidatorXUpdatesNotValidatingEvent extends Event<MultipleUpdatesEventData> {
	constructor(time: Date, publicKey: string, data: MultipleUpdatesEventData) {
		super(
			time,
			EventType.ValidatorXUpdatesNotValidating,
			{ type: SourceType.Node, id: publicKey },
			data
		);
	}
}

export class ValidatorLivenessRiskEvent extends Event<MultipleUpdatesEventData> {
	constructor(time: Date, publicKey: string, data: MultipleUpdatesEventData) {
		super(
			time,
			EventType.ValidatorLivenessRisk,
			{ type: SourceType.Node, id: publicKey },
			data
		);
	}
}

export class FullValidatorXUpdatesHistoryArchiveOutOfDateEvent extends Event<MultipleUpdatesEventData> {
	constructor(time: Date, publicKey: string, data: MultipleUpdatesEventData) {
		super(
			time,
			EventType.FullValidatorXUpdatesHistoryArchiveOutOfDate,
			{ type: SourceType.Node, id: publicKey },
			data
		);
	}
}

export class OrganizationXUpdatesUnavailableEvent extends Event<MultipleUpdatesEventData> {
	constructor(
		time: Date,
		organizationId: string,
		data: MultipleUpdatesEventData
	) {
		super(
			time,
			EventType.OrganizationXUpdatesUnavailable,
			{ type: SourceType.Organization, id: organizationId },
			data
		);
	}
}

export class NetworkTransitiveQuorumSetChangedEvent extends Event<ChangeEventData> {
	constructor(time: Date, networkId: string, data: ChangeEventData) {
		super(
			time,
			EventType.NetworkTransitiveQuorumSetChanged,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}

export class NetworkNodeLivenessRiskEvent extends Event<ChangeEventData> {
	constructor(time: Date, networkId: string, data: ChangeEventData) {
		super(
			time,
			EventType.NetworkNodeLivenessRisk,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}

export class NetworkNodeSafetyRiskEvent extends Event<ChangeEventData> {
	constructor(time: Date, networkId: string, data: ChangeEventData) {
		super(
			time,
			EventType.NetworkNodeSafetyRisk,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}

export class NetworkOrganizationLivenessRiskEvent extends Event<ChangeEventData> {
	constructor(time: Date, networkId: string, data: ChangeEventData) {
		super(
			time,
			EventType.NetworkOrganizationLivenessRisk,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}

export class NetworkOrganizationSafetyRiskEvent extends Event<ChangeEventData> {
	constructor(time: Date, networkId: string, data: ChangeEventData) {
		super(
			time,
			EventType.NetworkOrganizationSafetyRisk,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}
export class NetworkLossOfLivenessEvent extends Event<ChangeEventData> {
	constructor(
		time: Date,
		networkId: string,
		data: { from: number; to: number }
	) {
		super(
			time,
			EventType.NetworkLossOfLiveness,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}

export class NetworkLossOfSafetyEvent extends Event<ChangeEventData> {
	constructor(time: Date, networkId: string, data: ChangeEventData) {
		super(
			time,
			EventType.NetworkLossOfSafety,
			{ type: SourceType.Network, id: networkId },
			data
		);
	}
}
