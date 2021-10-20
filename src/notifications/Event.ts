import { Notification } from '../storage/entities/Notification';

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
	from: string[];
	to: string[];
}

export interface MultipleUpdatesEventData extends EventData {
	numberOfUpdates: number;
}

export class Event<T extends EventData> {
	constructor(
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
