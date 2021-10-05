import { config } from 'dotenv';
config();

import { isArray, isString } from './utilities/TypeGuards';
import { err, ok, Result } from 'neverthrow';
import * as yn from 'yn';
import { HorizonUrl } from './services/HorizonService';

type PublicKey = string;

export interface Config {
	topTierFallback: PublicKey[];
	loop: boolean;
	nodeEnv: string;
	sentryDSN: string | undefined;
	ipStackAccessKey: string;
	horizonUrl: HorizonUrl;
}

export class DefaultConfig implements Config {
	topTierFallback: PublicKey[];
	loop = false;
	nodeEnv = 'development';
	sentryDSN: string | undefined = undefined;
	ipStackAccessKey: string;
	horizonUrl: HorizonUrl;

	constructor(
		topTierFallback: PublicKey[],
		horizonUrl: HorizonUrl,
		ipStackAccessKey: string
	) {
		this.topTierFallback = topTierFallback;
		this.horizonUrl = horizonUrl;
		this.ipStackAccessKey = ipStackAccessKey;
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
	const horizonUrlResult = HorizonUrl.create(horizonUrl);
	if (horizonUrlResult.isErr()) return err(horizonUrlResult.error);

	const config = new DefaultConfig(
		topTierFallbackArray,
		horizonUrlResult.value,
		ipStackAccessKey
	);

	const loop = yn(process.env.LOOP);
	if (loop !== undefined) config.loop = loop;

	const env = process.env.NODE_ENV;
	if (isString(env)) config.nodeEnv = env;

	config.sentryDSN = process.env.SENTRY_DSN;

	return ok(config);
}
