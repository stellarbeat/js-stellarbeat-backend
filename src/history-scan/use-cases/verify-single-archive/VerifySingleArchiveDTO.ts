export interface VerifySingleArchiveDTO {
	historyUrl: string;
	fromLedger?: number;
	toLedger?: number;
	persist: boolean;
	maxConcurrency?: number;
}
