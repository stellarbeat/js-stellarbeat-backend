import { config } from 'dotenv';
config();

import { isArray, isString } from './utilities/TypeGuards';
import { err, ok, Result } from 'neverthrow';
import * as yn from 'yn';
import { Url } from './value-objects/Url';

type PublicKey = string;

export interface Config {
	topTierFallback: PublicKey[];
	loop: boolean;
	nodeEnv: string;
	enableSentry: boolean;
	sentryDSN: string | undefined;
	ipStackAccessKey: string;
	horizonUrl: Url;
	apiCacheClearUrl: Url;
	apiCacheClearToken: string;
	deadManSwitchUrl: Url | undefined;
	enableDeadManSwitch: boolean;
	enableS3Backup: boolean;
	s3AccessKeyId: string | undefined;
	s3Secret: string | undefined;
	s3BucketName: string | undefined;
	environment: string | undefined;
	apiPort: number;
	userAgent: string;
}

export class DefaultConfig implements Config {
	topTierFallback: PublicKey[];
	loop = false;
	nodeEnv = 'development';
	enableSentry = false;
	sentryDSN: string | undefined = undefined;
	ipStackAccessKey: string;
	horizonUrl: Url;
	apiCacheClearUrl: Url;
	apiCacheClearToken: string;
	enableDeadManSwitch = false;
	deadManSwitchUrl: Url | undefined;
	s3AccessKeyId: string | undefined;
	s3Secret: string | undefined;
	s3BucketName: string | undefined;
	enableS3Backup = false;
	environment: string | undefined;
	apiPort = 3000;
	userAgent = 'https://github.com/stellarbeat/js-stellarbeat-backend';

	constructor(
		topTierFallback: PublicKey[],
		horizonUrl: Url,
		ipStackAccessKey: string,
		apiCacheClearUrl: Url,
		apiCacheClearToken: string
	) {
		this.topTierFallback = topTierFallback;
		this.horizonUrl = horizonUrl;
		this.ipStackAccessKey = ipStackAccessKey;
		this.apiCacheClearToken = apiCacheClearToken;
		this.apiCacheClearUrl = apiCacheClearUrl;
	}
}

export function getConfigFromEnv(): Result<Config, Error> {
	const topTierFallbackRaw = process.env.TOP_TIER_FALLBACK;
	if (!isString(topTierFallbackRaw))
		return err(new Error('TOP_TIER_FALLBACK not a string'));

	const topTierFallbackArray = topTierFallbackRaw.split(' ');
	if (!isArray(topTierFallbackArray))
		return err(
			new Error(
				'TOP_TIER_FALLBACK wrong format: needs space separated public keys'
			)
		);

	const ipStackAccessKey = process.env.IPSTACK_ACCESS_KEY;
	if (!isString(ipStackAccessKey))
		return err(new Error('Ipstack access key not defined'));

	const horizonUrl = process.env.HORIZON_URL;
	if (!isString(horizonUrl))
		return err(new Error('HORIZON_URL is not defined'));
	const horizonUrlResult = Url.create(horizonUrl);
	if (horizonUrlResult.isErr()) return err(horizonUrlResult.error);

	const apiCacheClearToken = process.env.BACKEND_API_CACHE_TOKEN;
	if (!isString(apiCacheClearToken))
		return err(new Error('BACKEND_API_CACHE_TOKEN not defined'));

	const apiCacheClearUrl = process.env.BACKEND_API_CACHE_URL;
	if (!isString(apiCacheClearUrl))
		return err(new Error('BACKEND_API_CACHE_URL is not defined'));
	const apiCacheClearUrlResult = Url.create(
		apiCacheClearUrl + '?token=' + apiCacheClearToken
	);
	if (apiCacheClearUrlResult.isErr()) return err(apiCacheClearUrlResult.error);

	const config = new DefaultConfig(
		topTierFallbackArray,
		horizonUrlResult.value,
		ipStackAccessKey,
		apiCacheClearUrlResult.value,
		apiCacheClearToken
	);

	const loop = yn(process.env.LOOP);
	if (loop !== undefined) config.loop = loop;

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

	return ok(config);
}
