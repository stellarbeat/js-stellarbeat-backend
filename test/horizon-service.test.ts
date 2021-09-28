import axios from "axios";

require('dotenv').config();

import {HorizonService} from '../src';
import {Node} from "@stellarbeat/js-stellar-domain";

jest.mock('axios');

let node = new Node("GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI");

test('fetchAccount', async () => {
    let horizonService = new HorizonService();
    //@ts-ignore
    jest.spyOn(axios.CancelToken, 'source').mockReturnValue({token: 'token'});
    //@ts-ignore
    jest.spyOn(axios, 'get').mockReturnValue({data: {'home_domain': 'my-domain.net'}});
    let result = await horizonService.fetchAccount(node.publicKey);
    expect(result.isOk()).toBeTruthy();
    if (result.isOk())
        expect(result.value).toEqual({'home_domain': 'my-domain.net'});
});

test('fetchAccountError', async () => {
    let horizonService = new HorizonService();
    (axios.get as any).mockImplementation(() => {
        throw new Error("horizon down");
    });

    let result = await horizonService.fetchAccount(node.publicKey);
    expect(result.isErr()).toBeTruthy();
});