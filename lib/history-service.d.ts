export declare class HistoryService {
    fetchStellarHistory(historyUrl: string): Promise<object | undefined>;
    getCurrentLedger(stellarHistory: any): number | undefined;
    stellarHistoryIsUpToDate(stellarHistory: any): Promise<boolean>;
}
