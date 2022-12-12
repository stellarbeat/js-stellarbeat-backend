export interface UnmuteNotificationDTO {
	subscriberReference: string;
	eventSourceType: 'node' | 'organization' | 'network';
	eventSourceId: string;
	eventType: string;
}
