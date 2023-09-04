import { err, ok, Result } from 'neverthrow';
import * as toml from 'toml';
import { queue, retry } from 'async';
import { isString } from '../../../../core/utilities/TypeGuards';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { HttpService } from '../../../../core/services/HttpService';
import { Url } from '../../../../core/domain/Url';
import { CustomError } from '../../../../core/errors/CustomError';
import { Logger } from '../../../../core/services/PinoLogger';
import { mapUnknownToError } from '../../../../core/utilities/mapUnknownToError';
import { retryHttpRequestIfNeeded } from '../../../../core/utilities/HttpRequestRetry';

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
	): Promise<Map<string, Record<string, unknown> | TomlFetchError>> {
		const tomlObjects = new Map<
			string,
			Record<string, unknown> | TomlFetchError
		>();
		if (domains.length === 0) return tomlObjects;

		const q = queue(async (domain: string, callback) => {
			const tomlObjectResult = await this.fetchToml(domain);
			if (tomlObjectResult.isOk()) {
				this.logger.debug('Fetched toml for ' + domain + ' successfully');
				tomlObjects.set(domain, tomlObjectResult.value);
			} else {
				tomlObjects.set(domain, tomlObjectResult.error);
				this.logger.info('Failed to fetch toml for ' + domain, {
					error: mapUnknownToError(tomlObjectResult.error).message
				});
			}
			callback();
		}, 10);

		const uniqueDomains = new Set(domains);
		Array.from(uniqueDomains).forEach((domain) => q.push(domain));
		await q.drain();

		return tomlObjects;
	}

	async fetchToml(
		homeDomain: string
	): Promise<Result<Record<string, unknown>, TomlFetchError>> {
		const urlResult = Url.create(
			'https://' + homeDomain + '/.well-known/stellar.toml'
		);
		if (urlResult.isErr())
			return err(new TomlFetchError(homeDomain, urlResult.error));

		const tomlFileResponse = await retryHttpRequestIfNeeded(
			3,
			400,
			this.httpService.get.bind(this.httpService),
			urlResult.value,
			{
				maxContentLength: STELLAR_TOML_MAX_SIZE
			}
		);

		if (tomlFileResponse.isErr()) {
			return err(new TomlFetchError(homeDomain, tomlFileResponse.error));
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
}
