import { config } from 'dotenv';
config();

import { isArray, isString } from '../utilities/TypeGuards';
import { err, ok, Result } from 'neverthrow';
import * as yn from 'yn';
import { Url } from '../domain/Url';
import { CrawlerConfiguration } from '@stellarbeat/js-stellar-node-crawler';

type PublicKey = string;

export interface NetworkConfig {
	networkId: string;
	networkName: string;
	quorumSet: Array<PublicKey[] | PublicKey>;
	ledgerVersion: number;
	overlayVersion: number;
	overlayMinVersion: number;
	versionString: string;
}

export interface Config {
	nodeEnv: string;
	enableSentry: boolean;
	sentryDSN: string | undefined;
	ipStackAccessKey: string;
	horizonUrl: Url;
	deadManSwitchUrl: Url | undefined;
	enableDeadManSwitch: boolean;
	enableS3Backup: boolean;
	s3AccessKeyId: string | undefined;
	s3Secret: string | undefined;
	s3BucketName: string | undefined;
	environment: string | undefined;
	apiPort: number;
	userAgent: string;
	crawlerConfig: CrawlerConfiguration;
	networkConfig: NetworkConfig;
	enableNotifications: boolean;
	frontendBaseUrl?: string;
	userServiceBaseUrl?: string;
	userServiceUsername?: string;
	userServicePassword?: string;
	logLevel?: string;
	historyMaxFileMs?: number;
	historySlowArchiveMaxLedgers?: number;
}

export class DefaultConfig implements Config {
	nodeEnv = 'development';
	enableSentry = false;
	sentryDSN: string | undefined = undefined;
	enableDeadManSwitch = false;
	deadManSwitchUrl: Url | undefined;
	s3AccessKeyId: string | undefined;
	s3Secret: string | undefined;
	s3BucketName: string | undefined;
	enableS3Backup = false;
	environment: string | undefined;
	apiPort = 3000;
	userAgent = 'https://github.com/stellarbeat/js-stellarbeat-backend';
	enableNotifications = false;
	userServiceBaseUrl?: string;
	userServiceUsername?: string;
	userServicePassword?: string;
	frontendBaseUrl?: string;
	historyMaxFileMs?: number;
	historySlowArchiveMaxLedgers?: number;
	logLevel = 'info';

	constructor(
		public networkConfig: NetworkConfig,
		public horizonUrl: Url,
		public ipStackAccessKey: string,
		public crawlerConfig: CrawlerConfiguration
	) {}
}

export function getConfigFromEnv(): Result<Config, Error> {
	const networkQuorumSetRaw = process.env.NETWORK_QUORUM_SET;
	if (!isString(networkQuorumSetRaw))
		return err(new Error('NETWORK_QUORUM_SET is not a string'));

	const networkQuorumSet = JSON.parse(networkQuorumSetRaw);

	if (networkQuorumSet.length === 0)
		return err(
			new Error('networkQuorumSet must contain at least one public key')
		);

	const ipStackAccessKey = process.env.IPSTACK_ACCESS_KEY;
	if (!isString(ipStackAccessKey))
		return err(new Error('Ipstack access key not defined'));

	const horizonUrl = process.env.HORIZON_URL;
	if (!isString(horizonUrl))
		return err(new Error('HORIZON_URL is not defined'));
	const horizonUrlResult = Url.create(horizonUrl);
	if (horizonUrlResult.isErr()) return err(horizonUrlResult.error);

	let crawlerBlacklist = new Set<string>();
	if (isString(process.env.CRAWLER_BLACKLIST)) {
		const crawlerBlackListString = process.env.CRAWLER_BLACKLIST;
		const crawlerBlackListArray = crawlerBlackListString.split(' ');
		if (isArray(crawlerBlackListArray)) {
			crawlerBlacklist = new Set<string>(crawlerBlackListArray);
		}
	}

	const crawlerMaxConnectionsRaw = process.env.CRAWLER_MAX_CONNECTIONS;
	let crawlerMaxConnections = 25;
	if (!isNaN(Number(crawlerMaxConnectionsRaw)))
		crawlerMaxConnections = Number(crawlerMaxConnectionsRaw);

	const crawlerNodePrivateKey = process.env.CRAWLER_NODE_PRIVATE_KEY;
	const crawlerNodeLedgerVersion = Number(
		process.env.CRAWLER_NODE_LEDGER_VERSION
	);
	const crawlerNodeOverlayVersion = Number(
		process.env.CRAWLER_NODE_OVERLAY_VERSION
	);
	const crawlerNodeOverlayMinVersion = Number(
		process.env.CRAWLER_NODE_OVERLAY_MIN_VERSION
	);
	const crawlerNodeVersionString = process.env.CRAWLER_NODE_VERSION_STRING;

	let network = process.env.NETWORK;
	if (!isString(network))
		network = 'Public Global Stellar Network ; September 2015';

	let networkName = process.env.NETWORK_NAME;
	if (!isString(networkName)) networkName = network;

	const crawlerMaxCrawlTime = Number(process.env.CRAWLER_MAX_CRAWL_TIME);

	const maxFloodMessageCapacity = Number(process.env.MAX_FLOOD_CAPACITY);

	const ledgerVersion = Number.isNaN(crawlerNodeLedgerVersion)
		? 18
		: crawlerNodeLedgerVersion;
	const overlayMinVersion = Number.isNaN(crawlerNodeOverlayMinVersion)
		? 17
		: crawlerNodeOverlayMinVersion;
	const overlayVersion = Number.isNaN(crawlerNodeOverlayVersion)
		? 18
		: crawlerNodeOverlayVersion;
	const versionString = isString(crawlerNodeVersionString)
		? crawlerNodeVersionString
		: 'sb-backend-v0.3.0';

	const crawlerConfig: CrawlerConfiguration = {
		blackList: crawlerBlacklist,
		maxOpenConnections: crawlerMaxConnections,
		maxCrawlTime: Number.isNaN(crawlerMaxCrawlTime)
			? 900000
			: crawlerMaxCrawlTime,
		nodeConfig: {
			network: network,
			listeningPort: 11625,
			privateKey: crawlerNodePrivateKey,
			receiveSCPMessages: true,
			receiveTransactionMessages: false,
			nodeInfo: {
				networkId: network,
				ledgerVersion,
				overlayMinVersion,
				overlayVersion,
				versionString
			},
			maxFloodMessageCapacity: Number.isNaN(maxFloodMessageCapacity)
				? 200
				: maxFloodMessageCapacity
		}
	};

	const networkConfig: NetworkConfig = {
		networkId: network,
		networkName,
		quorumSet: networkQuorumSet,
		ledgerVersion,
		overlayMinVersion,
		overlayVersion,
		versionString
	};

	const config = new DefaultConfig(
		networkConfig,
		horizonUrlResult.value,
		ipStackAccessKey,
		crawlerConfig
	);

	const env = process.env.NODE_ENV;
	if (isString(env)) config.nodeEnv = env;

	const enableSentry = yn(process.env.ENABLE_SENTRY);
	config.enableSentry = enableSentry === undefined ? false : enableSentry;
	config.sentryDSN = process.env.SENTRY_DSN;

	let enableDeadManSwitch = yn(process.env.ENABLE_HEART_BEAT);
	if (enableDeadManSwitch === undefined) {
		enableDeadManSwitch = false;
	}

	config.enableDeadManSwitch = enableDeadManSwitch;
	if (config.enableDeadManSwitch) {
		const deadManSwitchUrl = process.env.DEADMAN_URL;
		if (!isString(deadManSwitchUrl))
			return err(new Error('DEADMAN_URL not defined'));
		const deadManSwitchUrlResult = Url.create(deadManSwitchUrl);
		if (deadManSwitchUrlResult.isErr())
			return err(deadManSwitchUrlResult.error);
		config.deadManSwitchUrl = deadManSwitchUrlResult.value;
	}

	let enableS3Backup = yn(process.env.ENABLE_S3_BACKUP);
	if (enableS3Backup === undefined) enableS3Backup = false;
	config.enableS3Backup = enableS3Backup;

	if (config.enableS3Backup) {
		const awsAccessKeyId = process.env.AWS_ACCESS_KEY;
		if (!isString(awsAccessKeyId))
			return err(new Error('AWS_ACCESS_KEY not defined'));
		config.s3AccessKeyId = awsAccessKeyId;

		const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
		if (!isString(awsSecretAccessKey))
			return err(new Error('AWS_SECRET_ACCESS_KEY not defined'));
		config.s3Secret = awsSecretAccessKey;

		const awsBucketName = process.env.AWS_BUCKET_NAME;
		if (!isString(awsBucketName))
			return err(new Error('AWS_BUCKET_NAME not defined'));
		config.s3BucketName = awsBucketName;
	}

	const apiPortString = process.env.PORT;
	if (isString(apiPortString)) config.apiPort = Number(apiPortString);

	const userAgent = process.env.USER_AGENT;
	if (isString(userAgent)) config.userAgent = userAgent;

	const logLevel = process.env.LOG_LEVEL;
	if (isString(logLevel)) config.logLevel = logLevel;

	let notificationsEnabled = yn(process.env.NOTIFICATIONS_ENABLED);
	if (notificationsEnabled === undefined) {
		notificationsEnabled = false;
	}

	if (notificationsEnabled) {
		const userServiceBaseUrl = process.env.USER_SERVICE_BASE_URL;
		if (!isString(userServiceBaseUrl))
			return err(
				new Error(
					'USER_SERVICE_BASE_URL must be defined to enable notifications'
				)
			);
		const userServiceUsername = process.env.USER_SERVICE_USERNAME;
		if (!isString(userServiceUsername))
			return err(
				new Error(
					'USER_SERVICE_USERNAME must be defined to enable notifications'
				)
			);
		const userServicePassword = process.env.USER_SERVICE_PASSWORD;
		if (!isString(userServicePassword))
			return err(
				new Error(
					'USER_SERVICE_PASSWORD must be defined to enable notifications'
				)
			);

		const frontendBaseUrl = process.env.FRONTEND_BASE_URL;
		if (!isString(frontendBaseUrl))
			return err(
				new Error('FRONTEND_BASE_URL must be defined to enable notifications')
			);
		config.enableNotifications = notificationsEnabled;
		config.userServiceBaseUrl = userServiceBaseUrl;
		config.userServicePassword = userServicePassword;
		config.userServiceUsername = userServiceUsername;
		config.frontendBaseUrl = frontendBaseUrl;
	}

	const historyMaxFileMs = Number(process.env.HISTORY_MAX_FILE_MS);
	if (!isNaN(historyMaxFileMs)) config.historyMaxFileMs = historyMaxFileMs;

	const historySlowArchiveMaxLedgers = Number(
		process.env.HISTORY_SLOW_ARCHIVE_MAX_LEDGERS
	);
	if (!isNaN(historySlowArchiveMaxLedgers))
		config.historySlowArchiveMaxLedgers = historySlowArchiveMaxLedgers;

	return ok(config);
}
