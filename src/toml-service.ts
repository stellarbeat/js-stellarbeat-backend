import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as toml from "toml";
import * as valueValidator from "validator";
import * as crypto from "crypto";
import Timeout = NodeJS.Timeout;


export const STELLAR_TOML_MAX_SIZE = 100 * 1024;

export class TomlService {
    protected _tomlCache: Map<string, Object> = new Map<string, Object>(); //multiple nodes can have the same domain & toml file

    async fetchToml(node:Node): Promise<object | undefined> {
        if (!(node.active && node.isValidator)) {
            return;
        }

        if(node.homeDomain === undefined) {
            return;
        }

        if (this._tomlCache.get(node.homeDomain) !== undefined) {
            return this._tomlCache.get(node.homeDomain);
        }

        let timeout:Timeout;

        try {
            let source = axios.CancelToken.source();
            timeout = setTimeout(() => {
                source.cancel('Connection time-out');
                // Timeout Logic
            }, 2050);
            let tomlFileResponse: any = await axios.get('https://' + node.homeDomain + '/.well-known/stellar.toml', {
                cancelToken: source.token,
                maxContentLength: STELLAR_TOML_MAX_SIZE,
                timeout: 2000,
                headers: { 'User-Agent': 'stellarbeat.io' }
            });
            clearTimeout(timeout);

            let tomlObject = toml.parse(tomlFileResponse.data);
            this._tomlCache.set(node.homeDomain, tomlObject);

            return tomlObject;

        } catch (err) {
            clearTimeout(timeout!);
            console.log("Error fetching toml for " + node.displayName + ": " + err.message);
            this._tomlCache.set(node.homeDomain, {});
            return {};
        }
    }

    updateNodeFromTomlObject(tomlObject: any, node:Node) {
        if(!Array.isArray(tomlObject.VALIDATORS)) {
            //check for history url in old format
            if(!Array.isArray(tomlObject.NODE_NAMES) || !Array.isArray(tomlObject.HISTORY) )
                return;
            let index = tomlObject.NODE_NAMES
                .map((name:string) => name.split(' ')[0])
                .indexOf(node.publicKey);

            let historyUrl = tomlObject.HISTORY[index];
            if(!historyUrl || !valueValidator.isURL(historyUrl))
                return;

            node.historyUrl = historyUrl;

            return;
        }

        let validator = tomlObject.VALIDATORS
            .find((validator:any) => validator.PUBLIC_KEY === node.publicKey);

        if(!validator) {
            return;
        }

        if(validator.HISTORY && valueValidator.isURL(validator.HISTORY))
            node.historyUrl = validator.HISTORY;

        if(validator.ALIAS && valueValidator.matches(validator.ALIAS, /^[a-z0-9-]{2,16}$/))
            node.alias = validator.ALIAS;

        if(validator.DISPLAY_NAME)
            node.name = valueValidator.escape(valueValidator.trim(validator.DISPLAY_NAME));

        if(validator.HOST && valueValidator.isURL(validator.HOST))
            node.host = validator.HOST;

    }

    /*
    * @deprecated
     */
    getNodeName(publicKey: string, tomlObject: any): string | undefined {
        let nodeNames = tomlObject.NODE_NAMES;
        if (nodeNames === undefined) {
            return undefined;
        }

        nodeNames = nodeNames.map(
            (nodeName: string) => valueValidator.escape(valueValidator.trim(nodeName)).replace(/\s+/g, ';').split(";")
        );

        let match = nodeNames.find((nodeName: Array<string>) => nodeName[0] === publicKey);
        if (match === undefined) {
            return undefined;
        }

        return match[1];
    }

    protected generateHash(value:string) {
        let hash = crypto.createHash('md5');
        hash.update(value);
        return hash.digest('hex');
    }

    getOrganization(tomlObject:any):Organization|undefined {

        if(!tomlObject.DOCUMENTATION || !tomlObject.DOCUMENTATION.ORG_NAME) {
            return;
        }

        let name = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_NAME));
        let organization = new Organization(this.generateHash(name), name);

        if(tomlObject.DOCUMENTATION.ORG_DBA) {
            organization.dba = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_DBA));
        }

        if(tomlObject.DOCUMENTATION.ORG_URL) {
            if(valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_URL))
                organization.url = valueValidator.trim(tomlObject.DOCUMENTATION.ORG_URL);
        }

        if(tomlObject.DOCUMENTATION.ORG_LOGO) {
            if(valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_LOGO))
                organization.logo = valueValidator.trim(tomlObject.DOCUMENTATION.ORG_LOGO);
        }

        if(tomlObject.DOCUMENTATION.ORG_DESCRIPTION) {
            organization.description = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_DESCRIPTION));
        }

        if(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS) {
            organization.physicalAddress = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS));
        }

        if(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION) {
            if(valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION))
                organization.physicalAddressAttestation = valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION);
        }

        if(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER) {
            organization.phoneNumber = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER));
        }

        if(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION) {
            if(valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION))
                organization.phoneNumberAttestation = valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION);
        }

        if(tomlObject.DOCUMENTATION.ORG_KEYBASE) {
            organization.keybase = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_KEYBASE));
        }

        if(tomlObject.DOCUMENTATION.ORG_TWITTER) {
            organization.twitter = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_TWITTER));
        }

        if(tomlObject.DOCUMENTATION.ORG_GITHUB) {
            organization.github = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_GITHUB));
        }

        if(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL) {
            if(valueValidator.isEmail(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL))
                organization.officialEmail = valueValidator.trim(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL);
        }

        if(tomlObject.DOCUMENTATION.ORG_LICENSING_AUTHORITY) {
            organization.officialEmail = valueValidator.escape(valueValidator.trim(tomlObject.DOCUMENTATION.ORG_LICENSING_AUTHORITY));
        }

        return organization;
    }

    getHistoryUrls(tomlObject: any, publicKey?:string): Array<string> { //when the new toml config format is in effect, this should become singular
        if(publicKey && Array.isArray(tomlObject.VALIDATORS)) {
            let validator = tomlObject.VALIDATORS
                .find((validator:any) => validator.PUBLIC_KEY === publicKey);
            if(validator && validator.HISTORY && valueValidator.isURL(validator.HISTORY))
                return [validator.HISTORY]; //todo return single url, not array, when old toml format is phased out
        }

        if (!
            Array.isArray(tomlObject.HISTORY)
        ) {
            return [];
        }

        return tomlObject.HISTORY.filter((url:any) => valueValidator.isURL(url));
    }
}