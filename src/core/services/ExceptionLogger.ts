import * as Sentry from '@sentry/node';
import { inject, injectable } from 'inversify';
import { Logger } from './PinoLogger';

export interface ExceptionLogger {
	captureException(error: Error, extra?: Record<string, unknown>): void;
}

export class ConsoleExceptionLogger implements ExceptionLogger {
	captureException(error: Error): void {
		//console.log('Captured exception');
		//console.error(error);
	}
}

@injectable()
export class SentryExceptionLogger implements ExceptionLogger {
	constructor(sentryDSN: string, @inject('Logger') protected logger: Logger) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	captureException(error: Error, extra?: Record<string, unknown>): void {
		this.logger.error(error.message, extra);
		Sentry.captureException(error, extra ? { extra: extra } : undefined);
	}
}
