export interface ScanGapsDTO {
	historyUrl?: string;
	fromLedger?: number;
	toLedger?: number;
	persist: boolean;
	loop: boolean;
	maxConcurrency?: number;
}
