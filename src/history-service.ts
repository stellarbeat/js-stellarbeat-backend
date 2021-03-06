import axios from "axios";
import {HorizonService} from "./horizon-service";
import {HorizonError} from "./errors/horizon-error";

export class HistoryService {

    protected _stellarHistoryCache: Map<string, boolean> = new Map();
    protected _horizonService: HorizonService = new HorizonService();

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
            clearTimeout(timeout!);
            console.log("error fetching history from " + historyUrl + ": " +err.message);
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

        let horizonInfo: any = await this._horizonService.fetchHorizonInfo();
        let realCurrentLedger = horizonInfo.core_latest_ledger;
        if(realCurrentLedger === undefined) {
            throw new HorizonError("core_latest_ledger not defined");
        }

        isUpToDate = currentLedger + 100 >= realCurrentLedger;//allow for a margin of 100 ledgers to account for delay in archiving
        this._stellarHistoryCache.set(historyUrl, isUpToDate);

        return isUpToDate;

    }
}