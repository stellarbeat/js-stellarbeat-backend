import { Url } from '../../domain/Url';
import { Config } from '../Config';
import { CrawlerConfiguration } from '@stellarbeat/js-stellar-node-crawler';
import { NodeConfig } from '@stellarbeat/js-stellar-node-connector/lib/node-config';
import { NodeInfo } from '@stellarbeat/js-stellar-node-connector/lib/node';

export class ConfigMock implements Config {
	logLevel = 'debug';
	deadManSwitchUrl: Url | undefined = { value: 'url' };
	enableDeadManSwitch = false;
	enableSentry = false;
	horizonUrl: Url = { value: 'url' };
	ipStackAccessKey = 'key';
	nodeEnv = 'test';
	sentryDSN: string | undefined = 'dsn';
	networkQuorumSet: Array<string | string[]> = [];
	apiPort = 3000;
	enableS3Backup = false;
	environment: string | undefined;
	s3AccessKeyId: string | undefined;
	s3BucketName: string | undefined;
	s3Secret: string | undefined;
	userAgent = 'test';
	crawlerConfig: CrawlerConfiguration = {
		blackList: new Set<string>(),
		maxOpenConnections: 25,
		maxCrawlTime: 900000,
		nodeConfig: {
			network: 'test',
			nodeInfo: {
				ledgerVersion: 1,
				overlayVersion: 1,
				overlayMinVersion: 1,
				versionString: '1'
			},
			listeningPort: 9000,
			receiveTransactionMessages: true,
			receiveSCPMessages: true,
			maxFloodMessageCapacity: 10000
		}
	};
	networkId = 'test';
	networkName = 'test';
	enableNotifications = true;
	userServiceBaseUrl = 'https://url.com';
	userServicePassword = 'pass';
	userServiceUsername = 'user';
	frontendBaseUrl = 'https://stellarbeat.io';
}
