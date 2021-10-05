import { config } from 'dotenv';
config();

import { isArray, isString } from './utilities/TypeGuards';
import { err, ok, Result } from 'neverthrow';
import * as yn from 'yn';

type PublicKey = string;

export interface Config {
	topTierFallback: PublicKey[];
	loop: boolean;
	nodeEnv: string;
	sentryDSN: string | undefined;
	ipStackAccessKey: string | undefined;
}

export class DefaultConfig implements Config {
	topTierFallback: PublicKey[];
	loop = false;
	nodeEnv = 'development';
	sentryDSN: string | undefined = undefined;
	ipStackAccessKey: string | undefined;

	constructor(topTierFallback: PublicKey[]) {
		this.topTierFallback = topTierFallback;
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

	const config = new DefaultConfig(topTierFallbackArray);

	const loop = yn(process.env.LOOP);
	if (loop !== undefined) config.loop = loop;

	const env = process.env.NODE_ENV;
	if (isString(env)) config.nodeEnv = env;

	config.sentryDSN = process.env.SENTRY_DSN;
	config.ipStackAccessKey = process.env.IPSTACK_ACCESS_KEY;

	return ok(config);
}
