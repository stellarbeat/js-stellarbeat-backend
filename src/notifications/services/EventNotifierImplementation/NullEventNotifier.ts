import { EventNotifier } from '../EventNotifier';
import { ok, Result } from 'neverthrow';
import * as Sentry from '@sentry/node';
import { injectable } from 'inversify';

@injectable()
export class ConsoleEventNotifier implements EventNotifier {
	constructor(sentryDSN: string) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	async notify(): Promise<Result<void, Error>> {
		return ok(undefined);
	}
}
