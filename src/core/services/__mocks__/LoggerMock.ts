import { logFn, Logger } from '../PinoLogger';
/* eslint-disable */
export class LoggerMock implements Logger {
	debug: logFn = (message, context) => {
		console.log(message, context);
	};
	error: logFn = (message, context) => {
		console.log(message, context);
	};
	fatal: logFn = (message, context) => {
		console.log(message, context);
	};
	info: logFn = (message, context) => {
		//console.log(message, context);
	};
	trace: logFn = (message, context) => {
		console.log(message, context);
	};
	warn: logFn = (message, context) => {
		console.log(message, context);
	};
	getRawLogger: any;
}
