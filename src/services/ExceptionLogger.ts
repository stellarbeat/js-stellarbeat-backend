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
	protected active = false;
	protected dsn?: string;

	constructor(activate = false, sentryDSN?: string) {
		this.dsn = sentryDSN;
		/*
        if (config.nodeEnv === 'production') {
            Sentry.init({ dsn: config.sentryDSN });
        }*/
		if (activate) this.activate();
	}

	activate() {
		if (!this.dsn) throw new Error('Sentry DSN not configured');
		if (!this.active) {
			Sentry.init({
				dsn: this.dsn
			});
			this.active = true;
		}
	}

	async deactivate(timeout: number) {
		if (!this.active) {
			await Sentry.close(timeout);
			this.active = false;
		}
	}

	captureException(error: Error) {
		if (this.active) Sentry.captureException(error);
	}
}
