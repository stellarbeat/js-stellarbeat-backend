import { err, ok, Result } from 'neverthrow';
import {
	Node as NodeDTO,
	Organization as OrganizationDTO
} from '@stellarbeat/js-stellarbeat-shared';
import * as toml from 'toml';
import valueValidator from 'validator';
import * as crypto from 'crypto';
import { queue } from 'async';
import {
	isArray,
	isObject,
	isString
} from '../../../../core/utilities/TypeGuards';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import {
	HttpService,
	isHttpError
} from '../../../../core/services/HttpService';
import { Url } from '../../../../core/domain/Url';
import { CustomError } from '../../../../core/errors/CustomError';
import { Logger } from '../../../../core/services/PinoLogger';
import { mapUnknownToError } from '../../../../core/utilities/mapUnknownToError';

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
		domains: string[] = []
	): Promise<Map<string, Record<string, unknown>>> {
		const tomlObjects = new Map<string, Record<string, unknown>>();

		const q = queue(async (domain: string, callback) => {
			const tomlObjectResult = await this.fetchToml(domain);
			if (tomlObjectResult.isOk()) {
				if (tomlObjectResult.value)
					tomlObjects.set(domain, tomlObjectResult.value);
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

	updateOrganizations(
		tomlObjects: Record<string, unknown>[],
		organizations: OrganizationDTO[],
		nodes: NodeDTO[]
	): OrganizationDTO[] {
		const idToOrganizationMap = new Map<string, OrganizationDTO>();
		organizations.forEach((organization) =>
			idToOrganizationMap.set(organization.id, organization)
		);
		const domainToOrganizationMap = new Map<string, OrganizationDTO>();
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

			if (!organization) {
				organization = new OrganizationDTO(
					domainOrganizationId,
					tomlOrganizationName ? tomlOrganizationName : toml.domain
				);
				organizations.push(organization);
			}
			organization.homeDomain = toml.domain;

			this.updateOrganization(organization, toml);

			const tomlValidators = toml.VALIDATORS;
			if (!isArray(tomlValidators)) return;

			const detectedValidators: string[] = [];

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
					//we don't want the organization to change validators just because it is archived
					detectedValidators.push(tomlValidator.PUBLIC_KEY);
					return;
				}

				if (validator.homeDomain !== toml.domain) return; //you cannot add nodes to your org that you do not own

				detectedValidators.push(validator.publicKey);

				//TODO: if node changes homeDomain property, we should remove it from the old organization
				//Or we could filter the node out on a higher level
			});

			//update validators in the organization to what the toml file says.
			organization.validators = detectedValidators;

			//if a node switched home domain, remove it from the old organization
			organizations.forEach((organization) => {
				organization.validators = organization.validators.filter(
					(validator) => {
						const node = publicKeyToNodeMap.get(validator);
						if (!node) return true;
						return node.homeDomain === organization.homeDomain;
					}
				);
			});
		});

		return organizations;
	}

	async fetchToml(
		homeDomain: string
	): Promise<Result<Record<string, unknown> | undefined, TomlFetchError>> {
		const urlResult = Url.create(
			'https://' + homeDomain + '/.well-known/stellar.toml'
		);
		if (urlResult.isErr())
			return err(new TomlFetchError(homeDomain, urlResult.error));

		const tomlFileResponse = await this.httpService.get(urlResult.value, {
			maxContentLength: STELLAR_TOML_MAX_SIZE
		});

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
			tomlObject.domain = homeDomain; //todo: return map of domain to toml instead of creating this property

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

	protected getOrganizationId(name: string): string {
		return this.generateHash(name);
	}

	public updateOrganization(
		organization: OrganizationDTO,
		tomlObject: Record<string, unknown>
	): OrganizationDTO {
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

		const organizationName = this.getOrganizationName(tomlObject);
		if (organizationName) organization.name = organizationName;

		return organization;
	}
}
