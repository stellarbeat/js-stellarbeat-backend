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

	const apiCacheClearUrl = process.env.BACKEND_API_CACHE_URL;
	if (!isString(apiCacheClearUrl))
		return err(new Error('BACKEND_API_CACHE_URL is not defined'));
	const apiCacheClearUrlResult = Url.create(apiCacheClearUrl);
	if (apiCacheClearUrlResult.isErr()) return err(apiCacheClearUrlResult.error);

	const apiCacheClearToken = process.env.BACKEND_API_CACHE_TOKEN;
	if (!isString(apiCacheClearToken))
		return err(new Error('BACKEND_API_CACHE_TOKEN not defined'));

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
	if (enableDeadManSwitch === undefined || !enableDeadManSwitch) {
		enableDeadManSwitch = false;
	}

	config.enableDeadManSwitch = enableDeadManSwitch;
	if (enableDeadManSwitch) {
		const deadManSwitchUrl = process.env.DEADMAN_URL;
		if (!isString(deadManSwitchUrl))
			return err(new Error('DEADMAN_URL not defined'));
		const deadManSwitchUrlResult = Url.create(deadManSwitchUrl);
		if (deadManSwitchUrlResult.isErr())
			return err(deadManSwitchUrlResult.error);
		config.deadManSwitchUrl = deadManSwitchUrlResult.value;
	}

	return ok(config);
}
