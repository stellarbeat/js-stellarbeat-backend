import { Config } from '../src';
import { Url } from '../src/value-objects/Url';

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
}
