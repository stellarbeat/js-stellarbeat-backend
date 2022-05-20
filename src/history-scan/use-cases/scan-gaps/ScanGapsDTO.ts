export interface ScanGapsDTO {
	historyUrl?: string;
	fromLedger?: number;
	toLedger?: number;
	concurrency: number;
	persist: boolean;
	loop: boolean;
}
