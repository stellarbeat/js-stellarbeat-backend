import {
	Node,
	Organization,
	OrganizationId,
	PublicKey
} from '@stellarbeat/js-stellar-domain';
import axios from 'axios';
import * as toml from 'toml';
import valueValidator from 'validator';
import * as crypto from 'crypto';
import { queue } from 'async';

export const STELLAR_TOML_MAX_SIZE = 100 * 1024;

function isDomain(domain: string | undefined): domain is string {
	return !!domain;
}

export class TomlService {
	protected _tomlCache: Map<string, Record<string, unknown>> = new Map<
		string,
		Record<string, unknown>
	>(); //multiple nodes can have the same domain & toml file

	async fetchTomlObjects(nodes: Node[] = []) {
		const domains = nodes //nodes supply the domain names where we can fetch the toml files
			.filter((node) => node.active && node.isValidator)
			.map((node) => node.homeDomain)
			.filter((domain) => isDomain(domain)) as string[];

		const tomlObjects: Record<string, unknown>[] = [];

		const q = queue(async (domain: string, callback) => {
			const tomlObject = await this.fetchToml(domain);
			if (tomlObject) tomlObjects.push(tomlObject);
			callback();
		}, 10);

		const uniqueDomains = new Set(domains);
		Array.from(uniqueDomains).forEach((domain) => q.push(domain));
		await q.drain();

		return tomlObjects;
	}

	processTomlObjects(
		tomlObjects: any[],
		organizations: Organization[],
		nodes: Node[]
	) {
		const idToOrganizationMap = new Map<OrganizationId, Organization>();
		organizations.forEach((organization) =>
			idToOrganizationMap.set(organization.id, organization)
		);
		const domainToOrganizationMap = new Map<string, Organization>();
		organizations
			.filter((organization) => organization.homeDomain)
			.forEach((organization) =>
				domainToOrganizationMap.set(organization.homeDomain!, organization)
			);
		const publicKeyToNodeMap = new Map(
			nodes.map((node) => [node.publicKey, node])
		);

		tomlObjects.forEach((toml) => {
			if (!toml.domain) return;

			const tomlOrganizationName = this.getOrganizationName(toml);
			const domainOrganizationId = this.getOrganizationId(toml.domain); //we fetch the organization linked to this toml file by domain

			let organization = idToOrganizationMap.get(domainOrganizationId);
			if (!organization) {
				//older organizations have id's not based on homeDomain, so we try to match them by their homeDomain property
				organization = domainToOrganizationMap.get(toml.domain);
			}
			if (!organization && tomlOrganizationName) {
				//legacy, can be deleted in the future
				organization = idToOrganizationMap.get(
					this.getOrganizationId(tomlOrganizationName)
				);
			}
			if (!organization) {
				organization = new Organization(
					domainOrganizationId,
					tomlOrganizationName ? tomlOrganizationName : toml.domain
				);
				organizations.push(organization);
			}
			organization.homeDomain = toml.domain;

			this.updateOrganization(organization, toml);

			const tomlValidators = toml.VALIDATORS;
			if (!tomlValidators) return;

			const detectedValidators: PublicKey[] = [];

			//update the validators in the toml file
			tomlValidators.forEach((tomlValidator: any) => {
				if (!tomlValidator.PUBLIC_KEY) return;

				const validator = publicKeyToNodeMap.get(tomlValidator.PUBLIC_KEY);
				if (!validator) return;
				if (validator.homeDomain !== toml.domain) return;

				this.updateValidator(validator, tomlValidator);
				detectedValidators.push(validator.publicKey);

				if (!organization) return; //typescript doesn't detect that organization is always an Organization instance

				//if a node switched orgs, remove it from the previous org.
				const previousOrganizationId = validator.organizationId;
				if (
					previousOrganizationId &&
					previousOrganizationId !== organization.id
				) {
					const previousOrganization = idToOrganizationMap.get(
						previousOrganizationId
					);
					if (previousOrganization) {
						const index = previousOrganization.validators.indexOf(
							validator.publicKey
						);
						if (index >= 0) previousOrganization.validators.splice(index, 1);
					}
				}

				validator.organizationId = organization.id;
			});

			//if validators are removed from toml file we need to update the organization reference in the removed nodes
			const removedNodes = organization.validators.filter(
				(publicKey) => !detectedValidators.includes(publicKey)
			);

			//update the removed nodes
			removedNodes.forEach((removedNodePublicKey) => {
				const node = publicKeyToNodeMap.get(removedNodePublicKey);
				if (!node) return;
				node.organizationId = undefined;
			});

			//update validators in the organization to what the toml file says.
			organization.validators = detectedValidators;
		});

		//handling legacy edge case where an organization was not archived when no more nodes referred to it
		const organizationIdsReferredToByNodes = new Set(
			nodes.map((node) => node.organizationId)
		);
		const organizationsWithoutNodes = organizations.filter(
			(organization) => !organizationIdsReferredToByNodes.has(organization.id)
		);
		console.log(
			'Organizations without nodes referring to it: ' +
				organizationsWithoutNodes.map((organization) => organization.id)
		);
		organizationsWithoutNodes.forEach(
			(organization) => (organization.validators = [])
		);

		return organizations;
	}

	protected updateValidator(validator: Node, tomlValidator: any) {
		if (tomlValidator.HISTORY && valueValidator.isURL(tomlValidator.HISTORY))
			validator.historyUrl = tomlValidator.HISTORY;

		if (
			tomlValidator.ALIAS &&
			valueValidator.matches(tomlValidator.ALIAS, /^[a-z0-9-]{2,16}$/)
		)
			validator.alias = tomlValidator.ALIAS;

		if (tomlValidator.DISPLAY_NAME)
			validator.name = valueValidator.escape(
				valueValidator.trim(tomlValidator.DISPLAY_NAME)
			);

		if (tomlValidator.HOST && valueValidator.isURL(tomlValidator.HOST))
			validator.host = tomlValidator.HOST;
	}

	async fetchToml(
		homeDomain: string
	): Promise<Record<string, unknown> | undefined> {
		if (this._tomlCache.get(homeDomain) !== undefined) {
			return this._tomlCache.get(homeDomain);
		}

		let timeout: any;

		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			const tomlFileResponse: any = await axios.get(
				'https://' + homeDomain + '/.well-known/stellar.toml',
				{
					cancelToken: source.token,
					maxContentLength: STELLAR_TOML_MAX_SIZE,
					timeout: 2000,
					headers: { 'User-Agent': 'stellarbeat.io' }
				}
			);
			clearTimeout(timeout);

			const tomlObject = toml.parse(tomlFileResponse.data);
			tomlObject.domain = homeDomain;
			this._tomlCache.set(homeDomain, tomlObject);

			return tomlObject;
		} catch (err) {
			if (timeout) clearTimeout(timeout);
			if (!(err instanceof Error))
				console.log('Info: Failed fetching toml for domain ' + homeDomain);
			else
				console.log(
					'Info: Failed fetching toml for domain ' +
						homeDomain +
						': ' +
						err.message
				);

			this._tomlCache.set(homeDomain, {});
			return {};
		}
	}

	protected generateHash(value: string) {
		const hash = crypto.createHash('md5');
		hash.update(value);
		return hash.digest('hex');
	}

	protected getOrganizationName(tomlObject: any): string | undefined {
		if (!tomlObject.DOCUMENTATION || !tomlObject.DOCUMENTATION.ORG_NAME) {
			return;
		}

		return valueValidator.escape(
			valueValidator.trim(tomlObject.DOCUMENTATION.ORG_NAME)
		);
	}

	protected getOrganizationId(name: string): OrganizationId {
		return this.generateHash(name);
	}

	protected updateOrganization(organization: Organization, tomlObject: any) {
		if (
			tomlObject.HORIZON_URL &&
			valueValidator.isURL(tomlObject.HORIZON_URL)
		) {
			organization.horizonUrl = valueValidator.trim(tomlObject.HORIZON_URL);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_DBA) {
			organization.dba = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_DBA)
			);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_URL) {
			if (valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_URL))
				organization.url = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_URL
				);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_LOGO) {
			if (valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_LOGO))
				organization.logo = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_LOGO
				);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_DESCRIPTION) {
			organization.description = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_DESCRIPTION)
			);
		}

		if (
			tomlObject.DOCUMENTATION &&
			tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS
		) {
			organization.physicalAddress = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS)
			);
		}

		if (
			tomlObject.DOCUMENTATION &&
			tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION
		) {
			if (
				valueValidator.isURL(
					tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION
				)
			)
				organization.physicalAddressAttestation = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS_ATTESTATION
				);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER) {
			organization.phoneNumber = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER)
			);
		}

		if (
			tomlObject.DOCUMENTATION &&
			tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION
		) {
			if (
				valueValidator.isURL(
					tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION
				)
			)
				organization.phoneNumberAttestation = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER_ATTESTATION
				);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_KEYBASE) {
			organization.keybase = valueValidator.escape(
				valueValidator
					.trim(tomlObject.DOCUMENTATION.ORG_KEYBASE)
					.replace('https://keybase.io/', '')
			);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_TWITTER) {
			organization.twitter = valueValidator.escape(
				valueValidator
					.trim(tomlObject.DOCUMENTATION.ORG_TWITTER)
					.replace('https://twitter.com/', '')
			);
		}

		if (tomlObject.DOCUMENTATION && tomlObject.DOCUMENTATION.ORG_GITHUB) {
			organization.github = valueValidator.escape(
				valueValidator
					.trim(tomlObject.DOCUMENTATION.ORG_GITHUB)
					.replace('https://github.com/', '')
			);
		}

		if (
			tomlObject.DOCUMENTATION &&
			tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL
		) {
			if (valueValidator.isEmail(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL))
				organization.officialEmail = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL
				);
		}

		return organization;
	}
}
