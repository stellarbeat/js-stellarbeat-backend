"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const axios_1 = require("axios");
const toml = require("toml");
exports.STELLAR_TOML_MAX_SIZE = 100 * 1024;
class TomlService {
    constructor() {
        this._tomlCache = new Map(); //multiple nodes can have the same domain & toml file
    }
    fetchToml(node) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!process.env.HORIZON_URL) {
                throw new Error('Horizon not configured');
            }
            try {
                let response = yield axios_1.default.get(process.env.HORIZON_URL + '/accounts/' + node.publicKey);
                let domain = response.data['home_domain'];
                if (domain === undefined) {
                    return undefined;
                }
                if (this._tomlCache.get(domain) !== undefined) {
                    return this._tomlCache.get(domain);
                }
                let tomlFileResponse = yield axios_1.default.get('https://' + domain + '/.well-known/stellar.toml', {
                    maxContentLength: exports.STELLAR_TOML_MAX_SIZE,
                    timeout: 2000
                });
                let tomlObject = toml.parse(tomlFileResponse.data);
                this._tomlCache.set(domain, tomlObject);
                return tomlObject;
            }
            catch (err) {
                return undefined;
            }
        });
    }
    getNodeName(publicKey, tomlObject) {
        let nodeNames = tomlObject.NODE_NAMES;
        if (nodeNames === undefined) {
            return undefined;
        }
        nodeNames = nodeNames.map((nodeName) => nodeName.split(" "));
        let match = nodeNames.find((nodeName) => nodeName[0] === publicKey);
        if (match === undefined) {
            return undefined;
        }
        return match[1];
    }
}
exports.TomlService = TomlService;
//# sourceMappingURL=toml-service.js.map