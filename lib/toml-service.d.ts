import { Node } from "@stellarbeat/js-stellar-domain";
export declare const STELLAR_TOML_MAX_SIZE: number;
export declare class TomlService {
    protected _tomlCache: Map<string, Object>;
    fetchToml(node: Node): Promise<object | undefined>;
    getNodeName(publicKey: string, tomlObject: any): string | undefined;
    getHistoryUrls(tomlObject: any): Array<string>;
}
