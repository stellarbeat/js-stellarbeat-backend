import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { Url } from '../../value-objects/Url';
import { HttpService } from '../../services/HttpService';
import { CustomError } from '../../errors/CustomError';

export interface HeartBeater {
	tick(): Promise<Result<void, Error>>;
}

@injectable()
export class DummyHeartBeater implements HeartBeater {
	tick() {
		return new Promise<Result<void, Error>>((resolve) =>
			resolve(ok(undefined))
		);
	}
}

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
