import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { Url } from '../value-objects/Url';
import { HttpService } from './HttpService';

@injectable()
export class APICacheClearer {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		protected url: Url
	) {
		this.httpService = httpService;
		this.url = url;
	}

	async clearApiCache(): Promise<Result<void, Error>> {
		const result = await this.httpService.get(this.url);
		if (result.isOk()) return ok(undefined);

		return err(result.error);
	}
}
