import { logFn, Logger } from '../src/services/PinoLogger';
/* eslint-disable */
export class LoggerMock implements Logger {
	debug: logFn = (message, context) => {};
	error: logFn = (message, context) => {};
	fatal: logFn = (message, context) => {};
	info: logFn = (message, context) => {};
	trace: logFn = (message, context) => {};
	warn: logFn = (message, context) => {};
}
