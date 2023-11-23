export interface NodeMeasurementEvent {
	time: string;
	publicKey: string;
	notValidating: boolean;
	inactive: boolean;
	historyOutOfDate: boolean;
	connectivityIssues: boolean;
	stellarCoreVersionBehindIssue: boolean;
}
