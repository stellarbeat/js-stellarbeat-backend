export interface UnmuteNotificationDTO {
	contactRef: string;
	eventSourceType: 'node' | 'organization' | 'network';
	eventSourceId: string;
	eventType: string;
}
