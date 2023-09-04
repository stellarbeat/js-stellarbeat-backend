import { TomlFetchError, TomlService } from '../../network/scan/TomlService';
import {
	isArray,
	isObject,
	isString
} from '../../../../core/utilities/TypeGuards';
import valueValidator from 'validator';
import { injectable } from 'inversify';
import { NodeTomlInfo } from './NodeTomlInfo';

@injectable()
export class NodeTomlFetcher {
	constructor(private tomlService: TomlService) {}

	async fetchNodeTomlInfoCollection(
		domains: string[] = []
	): Promise<Set<NodeTomlInfo>> {
		const tomlObjects = await this.tomlService.fetchTomlObjects(domains);
		const tomlNodeInfoCollection: Set<NodeTomlInfo> = new Set<NodeTomlInfo>();

		tomlObjects.forEach((tomlOrError, domain) => {
			if (tomlOrError instanceof TomlFetchError) return;
			const tomlValidators = tomlOrError.VALIDATORS;
			if (!isArray(tomlValidators)) return;
			tomlValidators.forEach((tomlValidator: unknown) => {
				if (!isObject(tomlValidator)) return;

				const tomlNodeInfo = NodeTomlFetcher.extractNodeTomlInfo(
					tomlValidator,
					domain
				);
				if (tomlNodeInfo !== null) {
					tomlNodeInfoCollection.add(tomlNodeInfo);
				}
			});
		});

		return tomlNodeInfoCollection;
	}
	private static extractNodeTomlInfo(
		tomlValidator: Record<string, unknown>,
		homeDomain: string
	): NodeTomlInfo | null {
		if (!isString(tomlValidator.PUBLIC_KEY)) return null;

		if (tomlValidator.PUBLIC_KEY.length !== 56) return null;

		const tomlNodeInfo: NodeTomlInfo = {
			homeDomain: homeDomain,
			publicKey: tomlValidator.PUBLIC_KEY,
			historyUrl: null,
			alias: null,
			host: null,
			name: null
		};

		if (
			isString(tomlValidator.HISTORY) &&
			valueValidator.isURL(tomlValidator.HISTORY)
		)
			tomlNodeInfo.historyUrl = tomlValidator.HISTORY;

		if (
			isString(tomlValidator.ALIAS) &&
			valueValidator.matches(tomlValidator.ALIAS, /^[a-z0-9-]{2,16}$/)
		)
			tomlNodeInfo.alias = tomlValidator.ALIAS;

		if (isString(tomlValidator.DISPLAY_NAME))
			tomlNodeInfo.name = valueValidator.escape(
				valueValidator.trim(tomlValidator.DISPLAY_NAME)
			);

		if (
			isString(tomlValidator.HOST) &&
			valueValidator.isURL(tomlValidator.HOST)
		)
			tomlNodeInfo.host = tomlValidator.HOST;

		return tomlNodeInfo;
	}
}
