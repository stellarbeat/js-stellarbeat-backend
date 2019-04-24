require('dotenv').config();

import {TomlService} from '../src';
import {Node} from "@stellarbeat/js-stellar-domain";

let tomlService = new TomlService();
let node = new Node("127.0.0.1");
node.publicKey = "GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI";

let tomlObject = JSON.parse('{"FEDERATION_SERVER":"https://stellar.sui.li/api/federation","SIGNING_KEY":"GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI","NODE_NAMES":["GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI    stellar.sui.li","GCDY5K3BDUSTWPIUDVYB2U7KLAOQYCYQMJKNMQWVQXM2NKYUXHGDZSUI stellar2.sui.li"],"ACCOUNTS":["$stellar.sui.li","$stellar2.sui.li","GCSALT7P5DEWLYQSUIQVNIFOYEZH3FFLQ3YBDHAREFMEZLLEWYFW5JZU","GCSALT6MOL2Q2MIGLHJDN64IUHKKBYRHFDEFGY7REPLEGGBEWMFZXSSK"],"OUR_VALIDATORS":["$stellar.sui.li","$stellar2.sui.li"],"ASSET_VALIDATOR":"$stellar.sui.li","DESIRED_BASE_FEE":100,"DESIRED_MAX_TX_PER_LEDGER":42,"KNOWN_PEERS":["stellar.sui.li:11625","stellar2.sui.li:11625","stellar3.sui.li:11625"],"HISTORY":["https://stellar.sui.li/history/"],"DOCUMENTATION":{"ORG_DBA":"sui","ORG_URL":"https://stellar.sui.li","ORG_LOGO":"https://stellar.sui.li/img/logo.png"},"PRINCIPALS":[{"name":"Suat Özgür","email":"s@sui.li","keybase":"sui77","github":"sui77","id_photo_hash":"59404c168e9cafda28f960d052a262803e9f1f7ce7a4c856c32fc53b0cc77d8d","verification_photo_hash":"000000008bf44a528a09d203203a6a97c165cf53a92ecc27aed0b49b86a19564"}],"CURRENCIES":[{"code":"NaCl","issuer":"GCSALT7P5DEWLYQSUIQVNIFOYEZH3FFLQ3YBDHAREFMEZLLEWYFW5JZU","status":"live","display_decimals":"7","name":"Salt","desc":"1 NaCl represents 10000000 ionic NaCl compounds. This asset is physically backed in a salt shaker in my kitchen. Simply create a trustline to get some NaCls for free.","image":"https://stellar.sui.li/NaCl/img.png","is_asset_anchored":true,"anchor_asset_type":"commodity","is_unlimited":false,"max_number":1000000}]}');
/*test('fetchToml', async () => {
    let toml = await tomlFetcher.fetchToml(node);
    console.log(toml);
    //expect(await tomlFetcher.fetchToml(node)).toEqual("woehoew");
});
*/

test('updateNodeName', () => {
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