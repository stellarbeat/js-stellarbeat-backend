import { logFn, Logger } from '../PinoLogger';
/* eslint-disable */
export class LoggerMock implements Logger {
	debug: logFn = (message, context) => {
		console.log(message);
	};
	error: logFn = (message, context) => {
		console.log(message);
	};
	fatal: logFn = (message, context) => {
		console.log(message);
	};
	info: logFn = (message, context) => {
		console.log(message);
	};
	trace: logFn = (message, context) => {
		console.log(message);
	};
	warn: logFn = (message, context) => {
		console.log(message);
	};
	getRawLogger: any;
}
