require('dotenv').config();

import {HistoryService, HorizonService} from '../src';

import axios from "axios";

jest.mock('axios');
jest.mock('./../src/horizon-service');


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

test('fetchStellarHistory', async () => {
    let historyService = new HistoryService();

    //@ts-ignore
    jest.spyOn(axios, 'get').mockReturnValue({data: JSON.parse(stellarHistoryJson)});
    //@ts-ignore
    jest.spyOn(axios.CancelToken, 'source').mockReturnValue( {token: 'token'});
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
    (HorizonService as any).mockImplementation(() => {
        return {
            fetchHorizonInfo: async () => {
                return Promise.resolve({"core_latest_ledger": 23586807});
            },
        };
    });
    let historyService = new HistoryService();

    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: JSON.parse(stellarHistoryJson)}));
    //@ts-ignore
    jest.spyOn(axios.CancelToken, 'source').mockReturnValue( {token: 'token'});
    expect(
        await historyService.stellarHistoryIsUpToDate('https://stellar.sui.li/history/')
    ).toEqual(true);
});

test('stellarHistoryIsNotUpToDate', async () => {
    (HorizonService as any).mockImplementation(() => {
        return {
            fetchHorizonInfo: async () => {
                return Promise.resolve({"core_latest_ledger": 20});
            },
        };
    });
    let historyService = new HistoryService();

    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: {'core_latest_ledger':20}}));
    expect(
        await historyService.stellarHistoryIsUpToDate('https://stellar.sui.li/history/')
    ).toEqual(false);
});
