import { Url } from '../src/value-objects/Url';
import { Config } from '../src/Config';

export class ConfigMock implements Config {
	apiCacheClearToken = 'token';
	apiCacheClearUrl = { value: 'url' };
	deadManSwitchUrl: Url | undefined = { value: 'url' };
	enableDeadManSwitch = false;
	enableSentry = false;
	horizonUrl: Url = { value: 'url' };
	ipStackAccessKey = 'key';
	loop = false;
	nodeEnv = 'test';
	sentryDSN: string | undefined = 'dsn';
	topTierFallback: string[] = [];
	apiPort = 3000;
	enableS3Backup = false;
	environment: string | undefined;
	s3AccessKeyId: string | undefined;
	s3BucketName: string | undefined;
	s3Secret: string | undefined;
	userAgent = 'test';
}
