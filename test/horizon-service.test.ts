import axios from "axios";

require('dotenv').config();

import {HorizonService} from '../src';
import {Node} from "@stellarbeat/js-stellar-domain";
import {HorizonError} from "../src/errors/horizon-error";

jest.mock('axios');

let node = new Node("127.0.0.1");
node.publicKey = "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI";

test('fetchAccount', async () => {
    let horizonService = new HorizonService();
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: {'home_domain': 'my-domain.net'}}));
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