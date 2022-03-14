import { err, ok, Result } from 'neverthrow';
import {
	Node,
	Organization,
	OrganizationId,
	PublicKey
} from '@stellarbeat/js-stellar-domain';
import * as toml from 'toml';
import valueValidator from 'validator';
import * as crypto from 'crypto';
import { queue } from 'async';
import { isString, isArray, isObject } from '../../shared/utilities/TypeGuards';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { HttpService, isHttpError } from '../../shared/services/HttpService';
import { Url } from '../../shared/domain/Url';
import { CustomError } from '../../shared/errors/CustomError';
import { Logger } from '../../shared/services/PinoLogger';
import { mapUnknownToError } from '../../shared/utilities/mapUnknownToError';

export const STELLAR_TOML_MAX_SIZE = 100 * 1024;

export class TomlFetchError extends CustomError {
	constructor(domain: string, cause?: Error) {
		super('Fetch toml failed for ' + domain, TomlFetchError.name, cause);
	}
}

@injectable()
export class TomlService {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') protected logger: Logger
	) {}

	async fetchTomlObjects(
		nodes: Node[] = []
	): Promise<Record<string, unknown>[]> {
		const domains = nodes //nodes supply the domain names where we can fetch the toml files
			.filter((node) => node.active && node.isValidator)
			.map((node) => node.homeDomain)
			.filter((domain) => isString(domain)) as string[];

		if (domains.length === 0) return [];

		const tomlObjects: Record<string, unknown>[] = [];

		const q = queue(async (domain: string, callback) => {
			const tomlObjectResult = await this.fetchToml(domain);
			if (tomlObjectResult.isOk()) {
				if (tomlObjectResult.value) tomlObjects.push(tomlObjectResult.value);
			}
			//do we want more info/logging?
			else this.logger.info(tomlObjectResult.error.message);
			callback();
		}, 10);

		const uniqueDomains = new Set(domains);
		Array.from(uniqueDomains).forEach((domain) => q.push(domain));
		await q.drain();

		return tomlObjects;
	}

	updateOrganizationsAndNodes(
		tomlObjects: Record<string, unknown>[],
		organizations: Organization[],
		nodes: Node[]
	): Organization[] {
		const idToOrganizationMap = new Map<OrganizationId, Organization>();
		organizations.forEach((organization) =>
			idToOrganizationMap.set(organization.id, organization)
		);
		const domainToOrganizationMap = new Map<string, Organization>();
		organizations.forEach((organization) => {
			if (isString(organization.homeDomain))
				domainToOrganizationMap.set(organization.homeDomain, organization);
		});

		const publicKeyToNodeMap = new Map(
			nodes.map((node) => [node.publicKey, node])
		);

		tomlObjects.forEach((toml) => {
			if (!isString(toml.domain)) return;

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
			if (!isArray(tomlValidators)) return;

			const detectedValidators: PublicKey[] = [];

			//update the validators in the toml file
			tomlValidators.forEach((tomlValidator: unknown) => {
				if (!isObject(tomlValidator)) return;

				if (!isString(tomlValidator.PUBLIC_KEY)) return;

				if (tomlValidator.PUBLIC_KEY.length !== 56) {
					this.logger.info('Public key found in toml file not 56 chars', {
						organization: JSON.stringify(organization),
						validator: tomlValidator.PUBLIC_KEY
					});
					return;
				}

				const validator = publicKeyToNodeMap.get(tomlValidator.PUBLIC_KEY);
				if (!validator) {
					//we do not know this validator. Or it could be archived.
					detectedValidators.push(tomlValidator.PUBLIC_KEY); //we don't want the organization to change validators just because it is archived
					return;
				}

				if (validator.homeDomain !== toml.domain) return; //you cannot add nodes to your org that you do not own

				this.updateValidator(validator, tomlValidator);
				detectedValidators.push(validator.publicKey);

				if (!organization) return; //typescript doesn't detect that organization is always an Organization instance

				//if a node switched organization, remove it from the previous org.
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
				node.organizationId = null;
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
		this.logger.info('Found Organizations without nodes referring to it', {
			organizations: organizationsWithoutNodes.map(
				(organization) => organization.id
			)
		});
		organizationsWithoutNodes.forEach(
			(organization) => (organization.validators = [])
		);

		return organizations;
	}

	protected updateValidator(
		validator: Node,
		tomlValidator: Record<string, unknown>
	): void {
		if (
			isString(tomlValidator.HISTORY) &&
			valueValidator.isURL(tomlValidator.HISTORY)
		)
			validator.historyUrl = tomlValidator.HISTORY;

		if (
			isString(tomlValidator.ALIAS) &&
			valueValidator.matches(tomlValidator.ALIAS, /^[a-z0-9-]{2,16}$/)
		)
			validator.alias = tomlValidator.ALIAS;

		if (isString(tomlValidator.DISPLAY_NAME))
			validator.name = valueValidator.escape(
				valueValidator.trim(tomlValidator.DISPLAY_NAME)
			);

		if (
			isString(tomlValidator.HOST) &&
			valueValidator.isURL(tomlValidator.HOST)
		)
			validator.host = tomlValidator.HOST;
	}

	async fetchToml(
		homeDomain: string
	): Promise<Result<Record<string, unknown> | undefined, TomlFetchError>> {
		const urlResult = Url.create(
			'https://' + homeDomain + '/.well-known/stellar.toml'
		);
		if (urlResult.isErr())
			return err(new TomlFetchError(homeDomain, urlResult.error));

		const tomlFileResponse = await this.httpService.get(
			urlResult.value,
			STELLAR_TOML_MAX_SIZE
		);

		if (tomlFileResponse.isErr()) {
			const error = tomlFileResponse.error;
			if (isHttpError(error)) {
				if (error.response && error.response.status === 404)
					return ok(undefined);
			}
			return err(new TomlFetchError(homeDomain, error));
		}

		if (!isString(tomlFileResponse.value.data))
			return err(
				new TomlFetchError(homeDomain, new Error('invalid toml string fetched'))
			);
		try {
			const tomlObject = toml.parse(tomlFileResponse.value.data);
			tomlObject.domain = homeDomain;

			return ok(tomlObject);
		} catch (e) {
			const error = mapUnknownToError(e);
			return err(new TomlFetchError(homeDomain, error));
		}
	}

	protected generateHash(value: string): string {
		const hash = crypto.createHash('md5');
		hash.update(value);
		return hash.digest('hex');
	}

	protected getOrganizationName(
		tomlObject: Record<string, unknown>
	): string | undefined {
		if (
			!isObject(tomlObject.DOCUMENTATION) ||
			!isString(tomlObject.DOCUMENTATION.ORG_NAME)
		) {
			return;
		}

		return valueValidator.escape(
			valueValidator.trim(tomlObject.DOCUMENTATION.ORG_NAME)
		);
	}

	protected getOrganizationId(name: string): OrganizationId {
		return this.generateHash(name);
	}

	public updateOrganization(
		organization: Organization,
		tomlObject: Record<string, unknown>
	): Organization {
		if (
			isString(tomlObject.HORIZON_URL) &&
			valueValidator.isURL(tomlObject.HORIZON_URL)
		) {
			organization.horizonUrl = valueValidator.trim(tomlObject.HORIZON_URL);
		}

		if (!isObject(tomlObject.DOCUMENTATION)) return organization;

		if (isString(tomlObject.DOCUMENTATION.ORG_DBA)) {
			organization.dba = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_DBA)
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_URL)) {
			if (valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_URL))
				organization.url = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_URL
				);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_LOGO)) {
			if (valueValidator.isURL(tomlObject.DOCUMENTATION.ORG_LOGO))
				organization.logo = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_LOGO
				);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_DESCRIPTION)) {
			organization.description = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_DESCRIPTION)
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS)) {
			organization.physicalAddress = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHYSICAL_ADDRESS)
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER)) {
			organization.phoneNumber = valueValidator.escape(
				valueValidator.trim(tomlObject.DOCUMENTATION.ORG_PHONE_NUMBER)
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_KEYBASE)) {
			organization.keybase = valueValidator.escape(
				valueValidator
					.trim(tomlObject.DOCUMENTATION.ORG_KEYBASE)
					.replace('https://keybase.io/', '')
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_TWITTER)) {
			organization.twitter = valueValidator.escape(
				valueValidator
					.trim(tomlObject.DOCUMENTATION.ORG_TWITTER)
					.replace('https://twitter.com/', '')
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_GITHUB)) {
			organization.github = valueValidator.escape(
				valueValidator
					.trim(tomlObject.DOCUMENTATION.ORG_GITHUB)
					.replace('https://github.com/', '')
			);
		}

		if (isString(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL)) {
			if (valueValidator.isEmail(tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL))
				organization.officialEmail = valueValidator.trim(
					tomlObject.DOCUMENTATION.ORG_OFFICIAL_EMAIL
				);
		}

		return organization;
	}
}
