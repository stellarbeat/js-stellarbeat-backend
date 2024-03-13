import { Url } from '../../domain/Url';
import { Config, NetworkConfig } from '../Config';
import { CrawlerConfiguration } from '@stellarbeat/js-stellar-node-crawler';

export class ConfigMock implements Config {
	logLevel = 'debug';
	deadManSwitchUrl: Url | undefined = { value: 'url' };
	enableDeadManSwitch = false;
	enableSentry = false;
	horizonUrl: Url = { value: 'url' };
	ipStackAccessKey = 'key';
	nodeEnv = 'test';
	sentryDSN: string | undefined = 'dsn';
	apiPort = 3000;
	enableS3Backup = false;
	environment: string | undefined;
	s3AccessKeyId: string | undefined;
	s3BucketName: string | undefined;
	s3Secret: string | undefined;
	s3Region: string | undefined;
	userAgent = 'test';
	crawlerConfig: CrawlerConfiguration = {
		consensusTimeoutMS: 1000,
		peerStraggleTimeoutMS: 1000,
		syncingTimeoutMS: 1000,
		quorumSetRequestTimeoutMS: 1000,
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
			peerFloodReadingCapacity: 200,
			flowControlSendMoreBatchSize: 40,
			peerFloodReadingCapacityBytes: 300000,
			flowControlSendMoreBatchSizeBytes: 100000
		}
	};
	networkConfig: NetworkConfig = {
		networkId: 'test',
		networkPassphrase: 'test network',
		networkName: 'test',
		quorumSet: [],
		ledgerVersion: 1,
		overlayVersion: 1,
		overlayMinVersion: 1,
		stellarCoreVersion: '1',
		knownPeers: []
	};
	enableNotifications = true;
	userServiceBaseUrl = 'https://url.com';
	userServicePassword = 'pass';
	userServiceUsername = 'user';
	frontendBaseUrl = 'https://stellarbeat.io';
	networkScanLoopIntervalMs = 1000;
}
