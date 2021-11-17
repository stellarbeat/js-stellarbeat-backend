import * as Sentry from '@sentry/node';
import { inject, injectable } from 'inversify';
import { Logger } from './PinoLogger';

export interface ExceptionLogger {
	captureException(error: Error): void;
}

export class ConsoleExceptionLogger implements ExceptionLogger {
	captureException(error: Error): void {
		console.log(error);
	}
}

@injectable()
export class SentryExceptionLogger implements ExceptionLogger {
	constructor(sentryDSN: string, @inject('Logger') protected logger: Logger) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	captureException(error: Error) {
		this.logger.error(error.message);
		Sentry.captureException(error);
	}
}
