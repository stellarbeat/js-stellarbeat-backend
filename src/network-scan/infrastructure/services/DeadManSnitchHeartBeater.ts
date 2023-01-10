import { inject, injectable } from 'inversify';
import { HttpService } from '../../../core/services/HttpService';
import { Url } from '../../../core/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../../core/errors/CustomError';
import { HeartBeater } from '../../../core/services/HeartBeater';

@injectable()
export class DeadManSnitchHeartBeater implements HeartBeater {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		protected url: Url
	) {
		this.url = url;
		this.httpService = httpService;
	}

	async tick(): Promise<Result<void, Error>> {
		const result = await this.httpService.get(this.url);
		if (result.isOk()) return ok(undefined);

		return err(
			new CustomError('Heartbeat tick failed', 'HeartbeatError', result.error)
		);
	}
}
