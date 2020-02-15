import axios from "axios";

require('dotenv').config();

import {TomlService} from '../src';
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import * as toml from "toml";
jest.mock('axios');

let node = new Node("127.0.0.1");
node.publicKey = "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI";
node.homeDomain = 'my-domain';
node.active = true;
node.isValidator = true;
node.quorumSet.validators.push("z");

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
    (axios.get as any).mockImplementationOnce(() => Promise.resolve({data: tomlString}));
    let toml = await tomlService.fetchToml(node);
    expect(toml).toEqual(tomlObject);
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

let tomlV2String = "FEDERATION_SERVER=\"https://api.domain.com/federation\"\n" +
    "AUTH_SERVER=\"https://api.domain.com/auth\"\n" +
    "TRANSFER_SERVER=\"https://api.domain.com\"\n" +
    "SIGNING_KEY=\"GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3\"\n" +
    "HORIZON_URL=\"https://horizon.domain.com\"\n" +
    "\n" +
    "ACCOUNTS=[\n" +
    "\"GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3\",\n" +
    "\"GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7\",\n" +
    "\"GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U\"\n" +
    "]\n" +
    "\n" +
    "VERSION=\"2.0.0\"\n" +
    "\n" +
    "[DOCUMENTATION]\n" +
    "ORG_NAME=\"Organization Name\"\n" +
    "ORG_DBA=\"Organization DBA\"\n" +
    "ORG_URL=\"https://www.domain.com\"\n" +
    "ORG_LOGO=\"https://www.domain.com/awesomelogo.jpg\"\n" +
    "ORG_DESCRIPTION=\"Description of issuer\"\n" +
    "ORG_PHYSICAL_ADDRESS=\"123 Sesame Street, New York, NY 12345, United States\"\n" +
    "ORG_PHYSICAL_ADDRESS_ATTESTATION=\"https://www.domain.com/address_attestation.jpg\"\n" +
    "ORG_PHONE_NUMBER=\"1 (123)-456-7890\"\n" +
    "ORG_PHONE_NUMBER_ATTESTATION=\"https://www.domain.com/phone_attestation.jpg\"\n" +
    "ORG_KEYBASE=\"accountname\"\n" +
    "ORG_TWITTER=\"orgtweet\"\n" +
    "ORG_GITHUB=\"orgcode\"\n" +
    "ORG_OFFICIAL_EMAIL=\"support@domain.com\"\n" +
    "\n" +
    "[[PRINCIPALS]]\n" +
    "name=\"Jane Jedidiah Johnson\"\n" +
    "email=\"jane@domain.com\"\n" +
    "keybase=\"crypto_jane\"\n" +
    "twitter=\"crypto_jane\"\n" +
    "github=\"crypto_jane\"\n" +
    "id_photo_hash=\"be688838ca8686e5c90689bf2ab585cef1137c999b48c70b92f67a5c34dc15697b5d11c982ed6d71be1e1e7f7b4e0733884aa97c3f7a339a8ed03577cf74be09\"\n" +
    "verification_photo_hash=\"016ba8c4cfde65af99cb5fa8b8a37e2eb73f481b3ae34991666df2e04feb6c038666ebd1ec2b6f623967756033c702dde5f423f7d47ab6ed1827ff53783731f7\"\n" +
    "\n" +
    "[[CURRENCIES]]\n" +
    "code=\"USD\"\n" +
    "issuer=\"GCZJM35NKGVK47BB4SPBDV25477PZYIYPVVG453LPYFNXLS3FGHDXOCM\"\n" +
    "display_decimals=2\n" +
    "\n" +
    "[[CURRENCIES]]\n" +
    "code=\"BTC\"\n" +
    "issuer=\"GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U\"\n" +
    "display_decimals=7\n" +
    "anchor_asset_type=\"crypto\"\n" +
    "anchor_asset=\"BTC\"\n" +
    "redemption_instructions=\"Use SEP6 with our federation server\"\n" +
    "collateral_addresses=[\"2C1mCx3ukix1KfegAY5zgQJV7sanAciZpv\"]\n" +
    "collateral_address_signatures=[\"304502206e21798a42fae0e854281abd38bacd1aeed3ee3738d9e1446618c4571d10\"]\n" +
    "\n" +
    "# asset with meta info\n" +
    "[[CURRENCIES]]\n" +
    "code=\"GOAT\"\n" +
    "issuer=\"GD5T6IPRNCKFOHQWT264YPKOZAWUMMZOLZBJ6BNQMUGPWGRLBK3U7ZNP\"\n" +
    "display_decimals=2\n" +
    "name=\"goat share\"\n" +
    "desc=\"1 GOAT token entitles you to a share of revenue from Elkins Goat Farm.\"\n" +
    "conditions=\"There will only ever be 10,000 GOAT tokens in existence. We will distribute the revenue share annually on Jan. 15th\"\n" +
    "image=\"https://pbs.twimg.com/profile_images/666921221410439168/iriHah4f.jpg\"\n" +
    "fixed_number=10000\n" +
    "\n" +
    "[[VALIDATORS]]\n" +
    "ALIAS=\"domain-au\"\n" +
    "DISPLAY_NAME=\"Domain Australia\"\n" +
    "HOST=\"core-au.domain.com:11625\"\n" +
    "PUBLIC_KEY=\"GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3\"\n" +
    "HISTORY=\"http://history.domain.com/prd/core-live/core_live_001/\"\n" +
    "\n" +
    "[[VALIDATORS]]\n" +
    "ALIAS=\"domain-sg\"\n" +
    "DISPLAY_NAME=\"Domain Singapore\"\n" +
    "HOST=\"core-sg.domain.com:11625\"\n" +
    "PUBLIC_KEY=\"GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7\"\n" +
    "HISTORY=\"http://history.domain.com/prd/core-live/core_live_002/\"\n" +
    "\n" +
    "[[VALIDATORS]]\n" +
    "ALIAS=\"domain-us\"\n" +
    "DISPLAY_NAME=\"Domain United States\"\n" +
    "HOST=\"core-us.domain.com:11625\"\n" +
    "PUBLIC_KEY=\"GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U\"\n" +
    "HISTORY=\"http://history.domain.com/prd/core-live/core_live_003/\"";

let tomlV2Object = toml.parse(tomlV2String);

let tomlStringOldHistoryFormat = `NODE_NAMES=[
  "FIRST_NODE_IN_ORGANIZATION first",
  "SECOND_NODE_IN_ORGANIZATION second",
  "THIRD_NODE_IN_ORGANIZATION third"
]

OUR_VALIDATORS=[
  "$first",
  "$second",
  "$third"
]

HISTORY=[
  "https://first.io",
  "https://second.io",
  "https://third.io"
]
`;

test('updateNodeOldTomlHistoryFormat', () =>{
    let tomlService = new TomlService();
    let myNode = new Node('localhost');
    myNode.publicKey = 'SECOND_NODE_IN_ORGANIZATION';
    tomlService.updateNodeFromTomlObject(tomlOldHistoryObject, myNode);
    expect(
        myNode.historyUrl
    ).toEqual("https://second.io");
});

let tomlOldHistoryObject = toml.parse(tomlStringOldHistoryFormat);

test('getHistoryUrlsTomlV2', () => {
    let tomlService = new TomlService();
    expect(
        tomlService.getHistoryUrls(tomlV2Object, "GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7")
    ).toEqual(["http://history.domain.com/prd/core-live/core_live_002/"]);
    expect(
        tomlService.getHistoryUrls(tomlV2Object, "NOKEY")
    ).toEqual([]);
});

let node2 = new Node("127.0.0.1");
node2.publicKey = "GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7";
node2.homeDomain = 'my-domain';
node2.active = true;
node2.quorumSet.validators.push("z");

test('updateNode', () =>{
    let tomlService = new TomlService();
    tomlService.updateNodeFromTomlObject(tomlV2Object, node2);
    expect(
        node2.historyUrl
    ).toEqual("http://history.domain.com/prd/core-live/core_live_002/");
    expect(
        node2.alias
    ).toEqual('domain-sg');
    expect(
        node2.name
    ).toEqual('Domain Singapore');
    expect(
        node2.host
    ).toEqual('core-sg.domain.com:11625');
});

test('getOrganization', () => {
    let tomlOrgString = '[DOCUMENTATION]\n' +
        'ORG_NAME="Organization Name"\n' +
        'ORG_DBA="Organization DBA"\n' +
        'ORG_URL="https://www.domain.com"\n' +
        'ORG_LOGO="https://www.domain.com/awesomelogo.jpg"\n' +
        'ORG_DESCRIPTION="Description of issuer"\n' +
        'ORG_PHYSICAL_ADDRESS="123 Sesame Street, New York, NY 12345, United States"\n' +
        'ORG_PHYSICAL_ADDRESS_ATTESTATION="https://www.domain.com/address_attestation.jpg"\n' +
        'ORG_PHONE_NUMBER="1 (123)-456-7890"\n' +
        'ORG_PHONE_NUMBER_ATTESTATION="https://www.domain.com/phone_attestation.jpg"\n' +
        'ORG_KEYBASE="accountname"\n' +
        'ORG_TWITTER="orgtweet"\n' +
        'ORG_GITHUB="orgcode"\n' +
        'ORG_OFFICIAL_EMAIL="support@domain.com"';
    let tomlOrgObject = toml.parse(tomlOrgString);
    let tomlService = new TomlService();
    let organization = new Organization("c1ca926603dc454ba981aa514db8402b", "Organization Name");
    organization.dba = "Organization DBA";
    organization.url = "https://www.domain.com";
    organization.logo = "https://www.domain.com/awesomelogo.jpg";
    organization.description = "Description of issuer";
    organization.physicalAddress = "123 Sesame Street, New York, NY 12345, United States";
    organization.physicalAddressAttestation = "https://www.domain.com/address_attestation.jpg";
    organization.phoneNumber = "1 (123)-456-7890";
    organization.phoneNumberAttestation = "https://www.domain.com/phone_attestation.jpg";
    organization.keybase = "accountname";
    organization.twitter = "orgtweet";
    organization.github = "orgcode";
    organization.officialEmail = "support@domain.com";

    expect(
        tomlService.getOrganization(tomlOrgObject)
    ).toEqual(organization);
});