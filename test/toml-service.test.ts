import axios from "axios";

require('dotenv').config();

import {TomlService} from '../src';
import {Node} from "@stellarbeat/js-stellar-domain";
import * as toml from "toml";
import {HorizonError} from "../src/errors/horizon-error";

jest.mock('axios');

let node = new Node("127.0.0.1");
node.publicKey = "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI";

let tomlString = 'FEDERATION_SERVER   = "https://stellar.sui.li/api/federation"\n' +
    '\n' +
    '#AUTH_SERVER         = "https://stellar.sui.li/api/auth"\n' +
    '\n' +
    '#TRANSFER_SERVER     = "https://stellar.sui.li/api/transfer"\n' +
    '\n' +
    '#KYC_SERVER          = "https://stellar.sui.li/api/kyc"\n' +
    '\n' +
    '#WEB_AUTH_ENDPOINT   = "https://stellar.sui.li/api/webauth"\n' +
    '\n' +
    'SIGNING_KEY         = "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI"\n' +
    '\n' +
    'NODE_NAMES = [\n' +
    '    "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI stellar.sui.li",\n' +
    '    "GCDY5K3BDUSTWPIUDVYB2U7KLAOQYCYQMJKNMQWVQXM2NKYUXHGDZSUI stellar2.sui.li"\n' +
    ']\n' +
    '\n' +
    'ACCOUNTS=[\n' +
    '    "$stellar.sui.li",\n' +
    '    "$stellar2.sui.li",\n' +
    '    "GCSALT7P5DEWLYQSUIQVNIFOYEZH3FFLQ3YBDHAREFMEZLLEWYFW5JZU",\n' +
    '    "GCSALT6MOL2Q2MIGLHJDN64IUHKKBYRHFDEFGY7REPLEGGBEWMFZXSSK"\n' +
    ']\n' +
    '\n' +
    'OUR_VALIDATORS=[\n' +
    '    "$stellar.sui.li",\n' +
    '    "$stellar2.sui.li"\n' +
    ']\n' +
    '\n' +
    'ASSET_VALIDATOR = "$stellar.sui.li"\n' +
    '\n' +
    'DESIRED_BASE_FEE = 100\n' +
    '\n' +
    'DESIRED_MAX_TX_PER_LEDGER = 42\n' +
    '\n' +
    'KNOWN_PEERS=[\n' +
    '    "stellar.sui.li:11625",\n' +
    '    "stellar2.sui.li:11625",\n' +
    '    "stellar3.sui.li:11625",\n' +
    ']\n' +
    '\n' +
    'HISTORY=[\n' +
    '    "https://stellar.sui.li/history/"\n' +
    ']\n' +
    '\n' +
    '[DOCUMENTATION]\n' +
    'ORG_DBA = "sui"\n' +
    'ORG_URL = "https://stellar.sui.li"\n' +
    'ORG_LOGO = "https://stellar.sui.li/img/logo.png"\n' +
    '\n' +
    '[[PRINCIPALS]]\n' +
    'name                    = "Suat Özgür"\n' +
    'email                   = "s@sui.li"\n' +
    'keybase                 = "sui77"\n' +
    'github                  = "sui77"\n' +
    'id_photo_hash           = "59404c168e9cafda28f960d052a262803e9f1f7ce7a4c856c32fc53b0cc77d8d"\n' +
    'verification_photo_hash = "000000008bf44a528a09d203203a6a97c165cf53a92ecc27aed0b49b86a19564"\n' +
    '\n' +
    '[[CURRENCIES]]\n' +
    'code = "NaCl"\n' +
    'issuer = "GCSALT7P5DEWLYQSUIQVNIFOYEZH3FFLQ3YBDHAREFMEZLLEWYFW5JZU"\n' +
    'status = "live"\n' +
    'display_decimals = "7"\n' +
    'name = "Salt"\n' +
    'desc = "1 NaCl represents 10000000 ionic NaCl compounds. This asset is physically backed in a salt shaker in my kitchen. Simply create a trustline to get some NaCls for free."\n' +
    'image = "https://stellar.sui.li/NaCl/img.png"\n' +
    'is_asset_anchored =true\n' +
    'anchor_asset_type = "commodity"\n' +
    'is_unlimited = false\n' +
    'max_number = 1000000';
let tomlObject = toml.parse(tomlString);

test('fetchToml', async () => {
    let tomlService = new TomlService();
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: {'home_domain': 'my-domain.net'}}));
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: tomlString}));
    let toml = await tomlService.fetchToml(node);
    expect(toml).toEqual(tomlObject);
});

test('fetchTomlHorizonDown', async () => {
    let tomlService = new TomlService();
    (axios.get as any).mockImplementation(() => {
        throw new Error("horizon down");
    });
    try {
        await tomlService.fetchToml(node);
    } catch (error) {
        expect(error).toBeInstanceOf(HorizonError);
    }
});

test('updateNodeName', () => {
    let tomlService = new TomlService();
    expect(
        tomlService.getNodeName("GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI", tomlObject)
    ).toEqual('stellar.sui.li');
    expect(
        tomlService.getNodeName("NOKEY", tomlObject)
    ).toEqual(undefined);
    expect(
        tomlService.getNodeName("NOKEY", {})
    ).toEqual(undefined);
});

test('getHistoryUrls', () => {
    let tomlService = new TomlService();
    expect(
        tomlService.getHistoryUrls(tomlObject)
    ).toEqual(["https://stellar.sui.li/history/"]);
    expect(
        tomlService.getHistoryUrls({})
    ).toEqual([]);
});