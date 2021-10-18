export enum EventType {
	NodeThreeNetworkUpdatesInactive,
	ValidatorThreeNetworkUpdatesNotValidating,
	ValidatorLivenessRisk,
	FullValidatorHistoryArchiveThreeNetworkUpdatesOutOfDate,
	OrganizationThreeNetworkUpdatesUnavailable,
	NetworkTransitiveQuorumSetChanged,
	NetworkNodeLivenessRisk,
	NetworkNodeSafetyRisk,
	NetworkOrganizationLivenessRisk,
	NetworkOrganizationSafetyRisk,
	NetworkLossOfLiveness,
	NetworkLossOfSafety
}

export class Event {
	readonly time: Date;
	readonly type: EventType;
	readonly target: string;

	constructor(time: Date, type: EventType, target: string) {
		this.time = time;
		this.type = type;
		this.target = target;
	}
}
