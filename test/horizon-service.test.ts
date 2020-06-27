import axios from "axios";

require('dotenv').config();

import {HorizonService} from '../src';
import {Node} from "@stellarbeat/js-stellar-domain";
import {HorizonError} from "../src/errors/horizon-error";

jest.mock('axios');

let node = new Node("127.0.0.1");
node.publicKey = "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI";
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

test('fetchAccount', async () => {
    let horizonService = new HorizonService();
    //@ts-ignore
    jest.spyOn(axios.CancelToken, 'source').mockReturnValue( {token: 'token'});
    //@ts-ignore
    jest.spyOn(axios, 'get').mockReturnValue( {data: {'home_domain': 'my-domain.net'}});
    expect(await horizonService.fetchAccount(node)).toEqual({'home_domain': 'my-domain.net'});
});

test('fetchAccountError', async () => {
    let horizonService = new HorizonService();
    (axios.get as any).mockImplementation(() => {
        throw new Error("horizon down");
    });
    try {
        await horizonService.fetchAccount(node);
    } catch (error) {
        expect(error).toBeInstanceOf(HorizonError);
    }
});

test('fetchHorizonInfo', async () => {
    let horizonService = new HorizonService();
    //@ts-ignore
    jest.spyOn(axios.CancelToken, 'source').mockReturnValue( {token: 'token'});
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: horizonJson}));
    expect(await horizonService.fetchHorizonInfo()).toEqual(horizonJson);
});

test('fetchHorizonInfoError', async () => {
    let horizonService = new HorizonService();
    (axios.get as any).mockImplementation(() => {
        throw new Error("horizon down");
    });
    try {
        await horizonService.fetchHorizonInfo();
    } catch (error) {
        expect(error).toBeInstanceOf(HorizonError);
    }
});