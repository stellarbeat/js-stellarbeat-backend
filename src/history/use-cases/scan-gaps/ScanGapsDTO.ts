export interface ScanGapsDTO {
	date: Date;
	historyUrl: string;
	fromLedger: number;
	toLedger: number;
	concurrency: number;
	persist: boolean;
}
