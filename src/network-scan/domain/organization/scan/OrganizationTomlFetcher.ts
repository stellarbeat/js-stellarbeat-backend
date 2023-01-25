import { injectable } from 'inversify';
import { TomlService } from '../../network/scan/TomlService';
import {
	isArray,
	isObject,
	isString
} from '../../../../core/utilities/TypeGuards';
import valueValidator from 'validator';
import { TomlOrganizationInfo } from './TomlOrganizationInfo';

@injectable()
export class OrganizationTomlFetcher {
	constructor(private tomlService: TomlService) {}

	async fetchOrganizationTomlInfoCollection(
		domains: string[] = []
	): Promise<Map<string, TomlOrganizationInfo>> {
		const tomlObjects = await this.tomlService.fetchTomlObjects(domains);
		const tomlOrganizationInfoCollection: Map<string, TomlOrganizationInfo> =
			new Map<string, TomlOrganizationInfo>();

		tomlObjects.forEach((toml, domain) => {
			const tomlOrganizationInfo = this.extractOrganizationTomlInfo(toml);
			tomlOrganizationInfoCollection.set(domain, tomlOrganizationInfo);
		});

		return tomlOrganizationInfoCollection;
	}

	private extractOrganizationTomlInfo(
		tomlObject: Record<string, unknown>
	): TomlOrganizationInfo {
		const tomlOrganizationInfo: TomlOrganizationInfo = {
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

		this.updateHorizonUrl(tomlObject, tomlOrganizationInfo);
		this.updateValidators(tomlObject, tomlOrganizationInfo);

		const documentation = tomlObject.DOCUMENTATION;
		if (!isObject(documentation)) return tomlOrganizationInfo;

		this.updateDBA(documentation, tomlOrganizationInfo);
		this.updateUrl(documentation, tomlOrganizationInfo);
		this.updateDescription(documentation, tomlOrganizationInfo);
		this.updatePhysicalAddress(documentation, tomlOrganizationInfo);
		this.updatePhoneNumber(documentation, tomlOrganizationInfo);
		this.updateKeybase(documentation, tomlOrganizationInfo);
		this.updateTwitter(documentation, tomlOrganizationInfo);
		this.updateGithub(documentation, tomlOrganizationInfo);
		this.updateEmail(documentation, tomlOrganizationInfo);
		tomlOrganizationInfo.name = this.getOrganizationName(documentation);

		return tomlOrganizationInfo;
	}

	private updateValidators(
		tomlObject: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
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

	private updateEmail(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_OFFICIAL_EMAIL)) {
			if (valueValidator.isEmail(documentation.ORG_OFFICIAL_EMAIL))
				tomlOrganizationInfo.officialEmail = valueValidator.trim(
					documentation.ORG_OFFICIAL_EMAIL
				);
		}
	}

	private updateGithub(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_GITHUB)) {
			tomlOrganizationInfo.github = valueValidator.escape(
				valueValidator
					.trim(documentation.ORG_GITHUB)
					.replace('https://github.com/', '')
			);
		}
	}

	private updateTwitter(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_TWITTER)) {
			tomlOrganizationInfo.twitter = valueValidator.escape(
				valueValidator
					.trim(documentation.ORG_TWITTER)
					.replace('https://twitter.com/', '')
			);
		}
	}

	private updateKeybase(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_KEYBASE)) {
			tomlOrganizationInfo.keybase = valueValidator.escape(
				valueValidator
					.trim(documentation.ORG_KEYBASE)
					.replace('https://keybase.io/', '')
			);
		}
	}

	private updatePhoneNumber(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_PHONE_NUMBER)) {
			tomlOrganizationInfo.phoneNumber = valueValidator.escape(
				valueValidator.trim(documentation.ORG_PHONE_NUMBER)
			);
		}
	}

	private updatePhysicalAddress(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_PHYSICAL_ADDRESS)) {
			tomlOrganizationInfo.physicalAddress = valueValidator.escape(
				valueValidator.trim(documentation.ORG_PHYSICAL_ADDRESS)
			);
		}
	}

	private updateDescription(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_DESCRIPTION)) {
			tomlOrganizationInfo.description = valueValidator.escape(
				valueValidator.trim(documentation.ORG_DESCRIPTION)
			);
		}
	}

	private updateUrl(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_URL)) {
			if (valueValidator.isURL(documentation.ORG_URL))
				tomlOrganizationInfo.url = valueValidator.trim(documentation.ORG_URL);
		}
	}

	private updateDBA(
		documentation: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
	) {
		if (isString(documentation.ORG_DBA)) {
			tomlOrganizationInfo.dba = valueValidator.escape(
				valueValidator.trim(documentation.ORG_DBA)
			);
		}
	}

	private updateHorizonUrl(
		tomlObject: Record<string, unknown>,
		tomlOrganizationInfo: TomlOrganizationInfo
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

	private getOrganizationName(
		documentation: Record<string, unknown>
	): string | null {
		if (!isString(documentation.ORG_NAME)) {
			return null;
		}

		return valueValidator.escape(valueValidator.trim(documentation.ORG_NAME));
	}
}
