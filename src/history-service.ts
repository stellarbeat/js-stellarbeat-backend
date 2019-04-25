import axios from "axios";

export class HistoryService {

    async fetchStellarHistory(historyUrl:string): Promise<object|undefined> {
        try {
            historyUrl = historyUrl.replace(/\/$/,''); //remove trailing slash
            let stellarHistoryUrl = historyUrl + '/.well-known/stellar-history.json';
            let response: any = await axios.get(stellarHistoryUrl);

            return JSON.parse(response.data);

        } catch (err) {
            return undefined;
        }
    }

    getCurrentLedger(stellarHistory:any):number|undefined{
        if(Number.isInteger(stellarHistory.currentLedger)) {
            return stellarHistory.currentLedger;
        }

        return undefined;
    }

    async stellarHistoryIsUpToDate(stellarHistory:any):Promise<boolean>{
        let currentLedger = this.getCurrentLedger(stellarHistory);
        if(currentLedger === undefined) {
            return false;
        }
        if (!process.env.HORIZON_URL) {
            throw new Error('Horizon not configured');
        }

        try {
            let getRealCurrentLedgerResponse: any = await axios.get(process.env.HORIZON_URL);
            let realCurrentLedger = JSON.parse(getRealCurrentLedgerResponse.data).core_latest_ledger;

            return currentLedger + 100 >= realCurrentLedger; //allow for a margin of 100 ledgers to account for delay in archiving

        } catch (err) {
            return false;
        }
    }
}