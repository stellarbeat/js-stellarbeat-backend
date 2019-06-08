import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import axios from "axios";
import * as toml from "toml";
import * as validator from "validator";
import * as crypto from "crypto";


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

        try {
            let tomlFileResponse: any = await axios.get('https://' + node.homeDomain + '/.well-known/stellar.toml', {
                maxContentLength: STELLAR_TOML_MAX_SIZE,
                timeout: 2000
            });

            let tomlObject = toml.parse(tomlFileResponse.data);
            this._tomlCache.set(node.homeDomain, tomlObject);

            return tomlObject;

        } catch (err) {
            console.log("Error fetching toml for " + node.displayName + ": " + err.message);
            this._tomlCache.set(node.homeDomain, {});
            return {};
        }
    }

    getNodeName(publicKey: string, tomlObject: any): string | undefined {
        let nodeNames = tomlObject.NODE_NAMES;
        if (nodeNames === undefined) {
            return undefined;
        }

        nodeNames = nodeNames.map(
            (nodeName: string) => validator.escape(validator.trim(nodeName)).replace(/\s+/g, ';').split(";")
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

        let name = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_NAME));
        let organization = new Organization(this.generateHash(name), name);

        if(tomlObject.DOCUMENTATION.ORG_DBA) {
            organization.dba = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_DBA));
        }

        if(tomlObject.DOCUMENTATION.ORG_URL) {
            if(validator.isURL(tomlObject.DOCUMENTATION.ORG_URL))
                organization.url = validator.trim(tomlObject.DOCUMENTATION.ORG_URL);
        }

        if(tomlObject.DOCUMENTATION.ORG_LOGO) {
            if(validator.isURL(tomlObject.DOCUMENTATION.ORG_LOGO))
                organization.logo = validator.trim(tomlObject.DOCUMENTATION.ORG_LOGO);
        }

        if(tomlObject.DOCUMENTATION.ORG_DESCRIPTION) {
            organization.description = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_DESCRIPTION));
        }

        if(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS) {
            organization.physicalAddress = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS));
        }

        if(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION) {
            if(validator.isURL(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION))
                organization.physicalAddressAttestation = validator.trim(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION);
        }

        if(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER) {
            organization.phoneNumber = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER));
        }

        if(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION) {
            if(validator.isURL(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION))
                organization.phoneNumberAttestation = validator.trim(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION);
        }

        if(tomlObject.DOCUMENTATION.ORG_KEYBASE) {
            organization.keybase = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_KEYBASE));
        }

        if(tomlObject.DOCUMENTATION.ORG_TWITTER) {
            organization.twitter = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_TWITTER));
        }

        if(tomlObject.DOCUMENTATION.ORG_GITHUB) {
            organization.github = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_GITHUB));
        }

        if(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL) {
            if(validator.isEmail(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL))
                organization.officialEmail = validator.trim(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL);
        }

        if(tomlObject.DOCUMENTATION.ORG_LICENSING_AUTHORITY) {
            organization.officialEmail = validator.escape(validator.trim(tomlObject.DOCUMENTATION.ORG_LICENSING_AUTHORITY));
        }

        return organization;
    }

    getHistoryUrls(tomlObject: any): Array<string> {
        if (!
            Array.isArray(tomlObject.HISTORY)
        ) {
            return [];
        }

        return tomlObject.HISTORY.filter((url:any) => validator.isURL(url));
    }
}