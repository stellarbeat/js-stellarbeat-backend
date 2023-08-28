import { pino } from 'pino';
import { injectable } from 'inversify';

export interface logFn {
	(message: string, obj?: Record<string, unknown>, ...args: unknown[]): void;
}

export interface Logger {
	trace: logFn;
	debug: logFn;
	info: logFn;
	warn: logFn;
	error: logFn;
	fatal: logFn;
	getRawLogger: any;
}

@injectable()
export class PinoLogger implements Logger {
	pino: pino.Logger;

	constructor(logLevel = 'info') {
		this.pino = pino({
			level: logLevel,
			base: undefined
		});
	}

	getRawLogger() {
		return this.pino;
	}

	debug: logFn = (message, context) => {
		this.forward('debug', message, context);
	};

	trace: logFn = (message, context) => {
		this.forward('trace', message, context);
	};

	info: logFn = (message, context) => {
		this.forward('info', message, context);
	};

	warn: logFn = (message, context) => {
		this.forward('warn', message, context);
	};

	error: logFn = (message, context) => {
		this.forward('error', message, context);
	};

	fatal: logFn = (message, context) => {
		this.forward('fatal', message, context);
	};

	protected forward(
		method: string,
		message: string,
		context?: Record<string, unknown>
	) {
		if (context) {
			// @ts-ignore
			this.pino[method](context, message);
		} else {
			// @ts-ignore
			this.pino[method](message);
		}
	}
}
