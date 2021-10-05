import * as Sentry from '@sentry/node';
import { injectable } from 'inversify';

export interface ExceptionLogger {
	captureException(error: Error): void;
}

export class ConsoleExceptionLogger implements ExceptionLogger {
	captureException(error: Error): void {
		console.log(error.message);
		console.log(error.stack);
	}
}

@injectable()
export class SentryExceptionLogger implements ExceptionLogger {
	constructor(sentryDSN: string) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	captureException(error: Error) {
		Sentry.captureException(error);
	}
}
