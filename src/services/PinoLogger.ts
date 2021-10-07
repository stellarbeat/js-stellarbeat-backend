import * as P from 'pino';
import { injectable } from 'inversify';

interface logFn {
	(message: string, obj: Record<string, unknown>, ...args: unknown[]): void;
}

export interface Logger {
	trace: logFn;
	debug: logFn;
	info: logFn;
	warn: logFn;
	error: logFn;
	fatal: logFn;
}

@injectable()
export class PinoLogger implements Logger {
	pino: P.Logger;

	constructor(logLevel = 'info') {
		this.pino = P({
			level: logLevel,
			base: undefined
		});
	}

	debug: logFn = (message, context) => {
		this.pino.debug(context, message);
	};

	trace: logFn = (message, context) => {
		this.pino.trace(context, message);
	};

	info: logFn = (message, context) => {
		this.pino.info(context, message);
	};

	warn: logFn = (message, context) => {
		this.pino.warn(context, message);
	};

	error: logFn = (message, context) => {
		this.pino.error(context, message);
	};

	fatal: logFn = (message, context) => {
		this.pino.fatal(context, message);
	};
}
