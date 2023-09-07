import { inject, injectable } from 'inversify';
import { TomlFetchError, TomlService } from '../../network/scan/TomlService';
import {
	isArray,
	isObject,
	isString
} from '../../../../core/utilities/TypeGuards';
import valueValidator from 'validator';
import { OrganizationTomlInfo } from './OrganizationTomlInfo';
import { TomlState } from './TomlState';
import { ErrorToTomlStateMapper } from './ErrorToTomlStateMapper';
import { TomlVersionChecker } from '../../network/scan/TomlVersionChecker';
import { Logger } from '../../../../core/services/PinoLogger';
import { HttpError } from '../../../../core/services/HttpService';

type homeDomain = string;

@injectable()
export class OrganizationTomlFetcher {
	constructor(
		private tomlService: TomlService,
		@inject('Logger') private logger: Logger
	) {}

	async fetchOrganizationTomlInfoCollection(
		domains: string[] = []
	): Promise<Map<homeDomain, OrganizationTomlInfo>> {
		const tomlObjects = await this.tomlService.fetchTomlObjects(domains);
		const tomlOrganizationInfoCollection: Map<string, OrganizationTomlInfo> =
			new Map<string, OrganizationTomlInfo>();

		tomlObjects.forEach((tomlOrError, domain) => {
			const tomlOrganizationInfo =
				this.extractOrganizationTomlInfo(tomlOrError);
			tomlOrganizationInfoCollection.set(domain, tomlOrganizationInfo);
		});

		return tomlOrganizationInfoCollection;
	}

	private extractOrganizationTomlInfo(
		tomlOrError: Record<string, unknown> | TomlFetchError
	): OrganizationTomlInfo {
		const tomlOrganizationInfo: OrganizationTomlInfo = {
			state: TomlState.Unknown,
			horizonUrl: null,
			dba: null,
			url: null,
			description: null,
			physicalAddress: null,
			phoneNumber: null,
			keybase: null,
			twitter: null,
			github: null,
			officialEmail: null,
			name: null,
			validators: []
		};

		if (tomlOrError instanceof TomlFetchError) {
			//todo: change to debug when stable
			if (tomlOrError.cause instanceof HttpError) {
				this.logger.info('Mapping http error to toml state', {
					message: tomlOrError.cause.message,
					code: tomlOrError.cause.code,
					status: tomlOrError.cause.response?.status,
					statusText: tomlOrError.cause.response?.statusText
				});
			}
			tomlOrganizationInfo.state = ErrorToTomlStateMapper.map(
				tomlOrError.cause
			);
			return tomlOrganizationInfo;
		}

		if (!TomlVersionChecker.isSupportedVersion(tomlOrError, '2.0.0'))
			tomlOrganizationInfo.state = TomlState.UnsupportedVersion;
		else tomlOrganizationInfo.state = TomlState.Ok;

		OrganizationTomlFetcher.updateHorizonUrl(tomlOrError, tomlOrganizationInfo);
		this.updateValidators(tomlOrError, tomlOrganizationInfo);

		const documentation = tomlOrError.DOCUMENTATION;
		if (!isObject(documentation)) return tomlOrganizationInfo;

		OrganizationTomlFetcher.updateDBA(documentation, tomlOrganizationInfo);
		OrganizationTomlFetcher.updateUrl(documentation, tomlOrganizationInfo);
		OrganizationTomlFetcher.updateDescription(
			documentation,
			tomlOrganizationInfo
		);
		OrganizationTomlFetcher.updatePhysicalAddress(
			documentation,
			tomlOrganizationInfo
		);
		OrganizationTomlFetcher.updatePhoneNumber(
			documentation,
			tomlOrganizationInfo
		);
		OrganizationTomlFetcher.updateKeybase(documentation, tomlOrganizationInfo);
		OrganizationTomlFetcher.updateTwitter(documentation, tomlOrganizationInfo);
		OrganizationTomlFetcher.updateGithub(documentation, tomlOrganizationInfo);
		OrganizationTomlFetcher.updateEmail(documentation, tomlOrganizationInfo);
		OrganizationTomlFetcher.updateOrganizationName(
			documentation,
			tomlOrganizationInfo
		);

		return tomlOrganizationInfo;
	}

	private updateValidators(
		tomlObject: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		const validators: string[] = [];

		const tomlValidators = tomlObject.VALIDATORS;
		if (isArray(tomlValidators)) {
			tomlValidators.forEach((tomlValidator) => {
				if (!isObject(tomlValidator)) return;
				if (!isString(tomlValidator.PUBLIC_KEY)) return;
				if (tomlValidator.PUBLIC_KEY.length !== 56) return;

				validators.push(tomlValidator.PUBLIC_KEY);
			});
		}

		tomlOrganizationInfo.validators = validators;
	}

	private static updateEmail(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_OFFICIAL_EMAIL)) {
			if (valueValidator.isEmail(documentation.ORG_OFFICIAL_EMAIL))
				tomlOrganizationInfo.officialEmail = valueValidator.trim(
					documentation.ORG_OFFICIAL_EMAIL
				);
		}
	}

	private static updateGithub(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_GITHUB)) {
			tomlOrganizationInfo.github = valueValidator.escape(
				valueValidator
					.trim(documentation.ORG_GITHUB)
					.replace('https://github.com/', '')
			);
		}
	}

	private static updateTwitter(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_TWITTER)) {
			tomlOrganizationInfo.twitter = valueValidator.escape(
				valueValidator
					.trim(documentation.ORG_TWITTER)
					.replace('https://twitter.com/', '')
			);
		}
	}

	private static updateKeybase(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_KEYBASE)) {
			tomlOrganizationInfo.keybase = valueValidator.escape(
				valueValidator
					.trim(documentation.ORG_KEYBASE)
					.replace('https://keybase.io/', '')
			);
		}
	}

	private static updatePhoneNumber(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_PHONE_NUMBER)) {
			tomlOrganizationInfo.phoneNumber = valueValidator.escape(
				valueValidator.trim(documentation.ORG_PHONE_NUMBER)
			);
		}
	}

	private static updatePhysicalAddress(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_PHYSICAL_ADDRESS)) {
			tomlOrganizationInfo.physicalAddress = valueValidator.escape(
				valueValidator.trim(documentation.ORG_PHYSICAL_ADDRESS)
			);
		}
	}

	private static updateDescription(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_DESCRIPTION)) {
			tomlOrganizationInfo.description = valueValidator.escape(
				valueValidator.trim(documentation.ORG_DESCRIPTION)
			);
		}
	}

	private static updateUrl(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_URL)) {
			if (valueValidator.isURL(documentation.ORG_URL))
				tomlOrganizationInfo.url = valueValidator.trim(documentation.ORG_URL);
		}
	}

	private static updateDBA(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (isString(documentation.ORG_DBA)) {
			tomlOrganizationInfo.dba = valueValidator.escape(
				valueValidator.trim(documentation.ORG_DBA)
			);
		}
	}

	private static updateHorizonUrl(
		tomlObject: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	) {
		if (
			isString(tomlObject.HORIZON_URL) &&
			valueValidator.isURL(tomlObject.HORIZON_URL)
		) {
			tomlOrganizationInfo.horizonUrl = valueValidator.trim(
				tomlObject.HORIZON_URL
			);
		}
	}

	private static updateOrganizationName(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: OrganizationTomlInfo
	): void {
		if (isString(documentation.ORG_NAME)) {
			tomlOrganizationInfo.name = valueValidator.escape(
				valueValidator.trim(documentation.ORG_NAME)
			);
		}
	}
}
