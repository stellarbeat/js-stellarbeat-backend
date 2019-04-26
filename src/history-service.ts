import axios from "axios";

export class HistoryService {

    protected _stellarHistoryCache: Map<string, boolean> = new Map();

    async fetchStellarHistory(historyUrl: string): Promise<object | undefined> {
        try {
            historyUrl = historyUrl.replace(/\/$/, ''); //remove trailing slash
            let stellarHistoryUrl = historyUrl + '/.well-known/stellar-history.json';
            let response: any = await axios.get(stellarHistoryUrl, {
                timeout: 2000
            });

            return JSON.parse(response.data);

        } catch (err) {
            return undefined;
        }
    }

    getCurrentLedger(stellarHistory: any): number | undefined {
        if (Number.isInteger(stellarHistory.currentLedger)) {
            return stellarHistory.currentLedger;
        }

        return undefined;
    }

    async stellarHistoryIsUpToDate(historyUrl: string): Promise<boolean> {
        let isUpToDate = this._stellarHistoryCache.get(historyUrl);
        if (isUpToDate !== undefined){
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

        if (!process.env.HORIZON_URL) {
            throw new Error('Horizon not configured');
        }

        try {
            let getRealCurrentLedgerResponse: any = await axios.get(process.env.HORIZON_URL,
                {
                    timeout: 2000
                });
            let realCurrentLedger = JSON.parse(getRealCurrentLedgerResponse.data).core_latest_ledger;

            isUpToDate = currentLedger + 100 >= realCurrentLedger;//allow for a margin of 100 ledgers to account for delay in archiving
            this._stellarHistoryCache.set(historyUrl, isUpToDate);

            return isUpToDate;

        } catch (err) {
            return false;
        }
    }
}