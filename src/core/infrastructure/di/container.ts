import { Config } from '../../config/Config';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { Logger, PinoLogger } from '../../services/PinoLogger';
import { HttpService } from '../../services/HttpService';
import { AxiosHttpService } from '../http/AxiosHttpService';
import { HeartBeater } from '../../services/HeartBeater';
import { DeadManSnitchHeartBeater } from '../../../network-scan/infrastructure/services/DeadManSnitchHeartBeater';
import { DummyHeartBeater } from '../../../network-scan/infrastructure/services/DummyHeartBeater';
import {
	ConsoleExceptionLogger,
	ExceptionLogger,
	SentryExceptionLogger
} from '../../services/ExceptionLogger';
import { HttpQueue } from '../../services/HttpQueue';
import { LoopTimer } from '../../services/LoopTimer';
import { JobMonitor } from '../../services/JobMonitor';
import { CORE_TYPES } from './di-types';
import { SentryJobMonitor } from '../services/SentryJobMonitor';
import { LoggerJobMonitor } from '../services/LoggerJobMonitor';

export function load(container: Container, config: Config) {
	container
		.bind<Logger>('Logger')
		.toDynamicValue(() => {
			return new PinoLogger(config.logLevel);
		})
		.inSingletonScope();
	container
		.bind<HttpService>('HttpService')
		.toDynamicValue(() => {
			return new AxiosHttpService(config.userAgent);
		})
		.inSingletonScope();

	container.bind<HeartBeater>('HeartBeater').toDynamicValue(() => {
		if (config.enableDeadManSwitch && config.deadManSwitchUrl)
			return new DeadManSnitchHeartBeater(
				container.get<HttpService>('HttpService'),
				config.deadManSwitchUrl
			);
		return new DummyHeartBeater();
	});

	container.bind<JobMonitor>(CORE_TYPES.JobMonitor).toDynamicValue(() => {
		if (config.enableSentry && config.sentryDSN)
			return new SentryJobMonitor(config.sentryDSN);
		return new LoggerJobMonitor(container.get<Logger>('Logger'));
	});

	container.bind<ExceptionLogger>('ExceptionLogger').toDynamicValue(() => {
		if (config.enableSentry && config.sentryDSN)
			return new SentryExceptionLogger(
				config.sentryDSN,
				container.get<Logger>('Logger')
			);
		else return new ConsoleExceptionLogger();
	});

	container.bind(HttpQueue).toSelf();
	container.bind(LoopTimer).toSelf();
}
