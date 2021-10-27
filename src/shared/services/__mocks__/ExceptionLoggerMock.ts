/* eslint-disable */
import { ExceptionLogger } from '../ExceptionLogger';

export class ExceptionLoggerMock implements ExceptionLogger {
	captureException(error: Error): void {}
}
