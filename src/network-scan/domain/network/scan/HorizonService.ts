import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { Url } from '../../../../core/domain/Url';
import {
	HttpService,
	isHttpError
} from '../../../../core/services/HttpService';
import { isObject } from '../../../../core/utilities/TypeGuards';
import { CustomError } from '../../../../core/errors/CustomError';

export type Account = {
	home_domain: string | undefined;
};
export class HorizonFetchAccountError extends CustomError {
	constructor(publicKey: string, cause?: Error) {
		super(
			'Failed fetching account for ' + publicKey,
			HorizonFetchAccountError.name,
			cause
		);
	}
}
@injectable()
export class HorizonService {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		protected horizonUrl: Url
	) {
		this.horizonUrl = horizonUrl;
		this.httpService = httpService;
	}

	async fetchAccount(
		publicKey: string
	): Promise<Result<Account | undefined, HorizonFetchAccountError>> {
		const accountResult = await this.fetch(
			this.horizonUrl.value + '/accounts/' + publicKey
		);
		if (accountResult.isErr())
			return err(new HorizonFetchAccountError(publicKey, accountResult.error));

		const account = accountResult.value;

		if (account === undefined) return ok(undefined);

		// eslint-disable-next-line no-prototype-builtins
		if (typeof account === 'object' && account.hasOwnProperty('home_domain'))
			return ok(account as Account);

		return ok(undefined);
	}

	protected async fetch(
		url: string
	): Promise<Result<Record<string, unknown> | undefined, Error>> {
		const urlResult = Url.create(url);
		if (urlResult.isErr()) return err(urlResult.error);
		const response = await this.httpService.get(urlResult.value);
		if (response.isErr()) {
			if (isHttpError(response.error)) {
				if (response.error.response && response.error.response.status === 404)
					return ok(undefined);
			}
			return err(response.error);
		}
		if (isObject(response.value.data)) return ok(response.value.data);
		return err(new Error('Data object missing in Horizon response'));
	}
}
