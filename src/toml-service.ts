import {Node} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as toml from "toml";
import {HorizonService} from "./horizon-service";

export const STELLAR_TOML_MAX_SIZE = 100 * 1024;

export class TomlService {
    protected _tomlCache: Map<string, Object> = new Map<string, Object>(); //multiple nodes can have the same domain & toml file
    protected _horizonService: HorizonService = new HorizonService();

    async fetchToml(node: Node): Promise<object | undefined> {
        let account: any = await this._horizonService.fetchAccount(node);

        let domain = account['home_domain'];

        if (domain === undefined) {
            return undefined;
        }

        if (this._tomlCache.get(domain) !== undefined) {
            return this._tomlCache.get(domain);
        }

        try {
            let tomlFileResponse: any = await axios.get('https://' + domain + '/.well-known/stellar.toml', {
                maxContentLength: STELLAR_TOML_MAX_SIZE,
                timeout: 2000
            });

            let tomlObject = toml.parse(tomlFileResponse.data);
            this._tomlCache.set(domain, tomlObject);

            return tomlObject;

        } catch (err) {
            console.log(err);
            //todo log
            return undefined;
        }
    }

    getNodeName(publicKey: string, tomlObject: any): string | undefined {
        let nodeNames = tomlObject.NODE_NAMES;
        if (nodeNames === undefined) {
            return undefined;
        }

        nodeNames = nodeNames.map(
            (nodeName: string) => nodeName.replace(/\s+/g, ';').split(";")
        );

        let match = nodeNames.find((nodeName: Array<string>) => nodeName[0] === publicKey);
        if (match === undefined) {
            return undefined;
        }

        return match[1];
    }

    getHistoryUrls(tomlObject: any): Array<string> {
        if (!
            Array.isArray(tomlObject.HISTORY)
        ) {
            return [];
        }

        return tomlObject.HISTORY;
    }
}