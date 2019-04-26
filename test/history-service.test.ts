require('dotenv').config();

import {HistoryService} from '../src';
import axios from "axios";

jest.mock('axios');

let stellarHistoryJson = '{\n' +
    '    "version": 1,\n' +
    '    "server": "v10.2.0-64-g89f2ba32",\n' +
    '    "currentLedger": 23586760,\n' +
    '    "currentBuckets": [\n' +
    '        {\n' +
    '            "curr": "e7984e605971d07352e4eda31a61c4e25bc0d8c5bab28e2731639534a1b813a1",\n' +
    '            "next": {\n' +
    '                "state": 0\n' +
    '            },\n' +
    '            "snap": "bb88aeb1a3418126682c52aaf3b88fae1fb3cd1df47aa6901c8d7fc172fa9ad8"\n' +
    '        }]}';
let horizonJson = '{\n' +
    '  "horizon_version": "0.17.4-1d3d46259bacf567dd75feece3ecd994e9d93e49",\n' +
    '  "core_version": "stellar-core 10.3.0 (de204d718a4603fba2c36d79a7cccad415dd1597)",\n' +
    '  "history_latest_ledger": 23586805,\n' +
    '  "history_elder_ledger": 1,\n' +
    '  "core_latest_ledger": 23586807,\n' +
    '  "network_passphrase": "Public Global Stellar Network ; September 2015",\n' +
    '  "current_protocol_version": 10,\n' +
    '  "core_supported_protocol_version": 10\n' +
    '}';

test('fetchStellarHistory', async () => {
    let historyService = new HistoryService();

    (axios.get as any).mockImplementation(() => Promise.resolve({data: stellarHistoryJson}));
    expect(
        await historyService.fetchStellarHistory('https://stellar.sui.li/history/')
    ).toEqual(JSON.parse(stellarHistoryJson));
});

test('getCurrentLedger', () => {
    let historyService = new HistoryService();

    expect(
        historyService.getCurrentLedger(JSON.parse(stellarHistoryJson))
    ).toEqual(23586760);
    expect(
        historyService.getCurrentLedger({})
    ).toEqual(undefined);
});

test('stellarHistoryIsUpToDate', async () => {
    let historyService = new HistoryService();

    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: stellarHistoryJson}));
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: horizonJson}));
    expect(
        await historyService.stellarHistoryIsUpToDate('https://stellar.sui.li/history/')
    ).toEqual(true);
});

test('stellarHistoryIsNotUpToDate', async () => {
    let historyService = new HistoryService();

    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: {'core_latest_ledger':20}}));
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: horizonJson}));
    expect(
        await historyService.stellarHistoryIsUpToDate('https://stellar.sui.li/history/')
    ).toEqual(false);
});