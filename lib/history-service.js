"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const axios_1 = require("axios");
class HistoryService {
    fetchStellarHistory(historyUrl) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                historyUrl = historyUrl.replace(/\/$/, ''); //remove trailing slash
                let stellarHistoryUrl = historyUrl + '/.well-known/stellar-history.json';
                let response = yield axios_1.default.get(stellarHistoryUrl);
                return JSON.parse(response.data);
            }
            catch (err) {
                return undefined;
            }
        });
    }
    getCurrentLedger(stellarHistory) {
        if (Number.isInteger(stellarHistory.currentLedger)) {
            return stellarHistory.currentLedger;
        }
        return undefined;
    }
    stellarHistoryIsUpToDate(stellarHistory) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let currentLedger = this.getCurrentLedger(stellarHistory);
            if (currentLedger === undefined) {
                return false;
            }
            if (!process.env.HORIZON_URL) {
                throw new Error('Horizon not configured');
            }
            try {
                let getRealCurrentLedgerResponse = yield axios_1.default.get(process.env.HORIZON_URL);
                let realCurrentLedger = JSON.parse(getRealCurrentLedgerResponse.data).core_latest_ledger;
                return currentLedger + 100 >= realCurrentLedger; //allow for a margin of 100 ledgers to account for delay in archiving
            }
            catch (err) {
                return false;
            }
        });
    }
}
exports.HistoryService = HistoryService;
//# sourceMappingURL=history-service.js.map