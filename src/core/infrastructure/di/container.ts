import { Config } from '../../config/Config';
import { interfaces } from 'inversify';
import Container = interfaces.Container;
import { Logger, PinoLogger } from '../../services/PinoLogger';
import { HttpService } from '../../services/HttpService';
import { AxiosHttpService } from '../http/AxiosHttpService';
import { Archiver } from '../../../network-scan/domain/archiver/Archiver';
import {
	DummyJSONArchiver,
	S3Archiver
} from '../../../network-scan/infrastructure/services/S3Archiver';
import { HeartBeater } from '../../services/HeartBeater';
import { DeadManSnitchHeartBeater } from '../../../network-scan/infrastructure/services/DeadManSnitchHeartBeater';
import { DummyHeartBeater } from '../../../network-scan/infrastructure/services/DummyHeartBeater';
import {
	ConsoleExceptionLogger,
	ExceptionLogger,
	SentryExceptionLogger
} from '../../services/ExceptionLogger';
import { HttpQueue } from '../../services/HttpQueue';

export function load(
	container: Container,
	connectionName: string | undefined,
	config: Config
) {
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

	container.bind<Archiver>('JSONArchiver').toDynamicValue(() => {
		if (
			config.enableS3Backup &&
			config.s3Secret &&
			config.s3AccessKeyId &&
			config.s3BucketName
		)
			return new S3Archiver(
				config.s3AccessKeyId,
				config.s3Secret,
				config.s3BucketName,
				config.nodeEnv
			);
		return new DummyJSONArchiver(container.get<Logger>('Logger'));
	});
	container.bind<HeartBeater>('HeartBeater').toDynamicValue(() => {
		if (config.enableDeadManSwitch && config.deadManSwitchUrl)
			return new DeadManSnitchHeartBeater(
				container.get<HttpService>('HttpService'),
				config.deadManSwitchUrl
			);
		return new DummyHeartBeater();
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
}