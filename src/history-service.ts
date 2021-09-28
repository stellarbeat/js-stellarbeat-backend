import axios from "axios";

export class HistoryService {

    protected _stellarHistoryCache: Map<string, boolean> = new Map();

    async fetchStellarHistory(historyUrl: string): Promise<object | undefined> {
        let timeout:any;
        try {
            historyUrl = historyUrl.replace(/\/$/, ''); //remove trailing slash
            let stellarHistoryUrl = historyUrl + '/.well-known/stellar-history.json';
            let source = axios.CancelToken.source();
            timeout = setTimeout(() => {
                source.cancel('Connection time-out');
                // Timeout Logic
            }, 2050);
            let response: any = await axios.get(stellarHistoryUrl, {
                cancelToken: source.token,
                timeout: 2000,
                headers: { 'User-Agent': 'stellarbeat.io' }
            });

            clearTimeout(timeout);
            return response.data;

        } catch (err) {
            if(timeout)
                clearTimeout(timeout);
            console.log("error fetching history from " + historyUrl + (err instanceof Error ? ": " + err.message : ""));
            return undefined;
        }
    }

    getCurrentLedger(stellarHistory: any): number | undefined {
        if (Number.isInteger(stellarHistory.currentLedger)) {
            return stellarHistory.currentLedger;
        }

        return undefined;
    }

    async stellarHistoryIsUpToDate(historyUrl: string, latestLedger: string): Promise<boolean> {
        let isUpToDate = this._stellarHistoryCache.get(historyUrl);
        if (isUpToDate !== undefined) {
            return isUpToDate;
        }

        this._stellarHistoryCache.set(historyUrl, false);
        let stellarHistory = await this.fetchStellarHistory(historyUrl);

        if (stellarHistory === undefined) {
            return false;
        }

        let currentLedger = this.getCurrentLedger(stellarHistory);
        if (currentLedger === undefined) {
            return false;
        }

        //todo: latestLedger sequence is bigint, but horizon returns number type for ledger sequence
        isUpToDate = currentLedger + 100 >= Number(latestLedger);//allow for a margin of 100 ledgers to account for delay in archiving
        this._stellarHistoryCache.set(historyUrl, isUpToDate);

        return isUpToDate;

    }
}