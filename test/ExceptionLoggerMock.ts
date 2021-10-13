/* eslint-disable */
import { ExceptionLogger } from '../src/services/ExceptionLogger';

export class ExceptionLoggerMock implements ExceptionLogger {
	captureException(error: Error): void {}
}
