export interface OrganizationMeasurementEvent {
	time: string;
	organizationId: string;
	subQuorumUnavailable: boolean;
	tomlIssue: boolean;
}
