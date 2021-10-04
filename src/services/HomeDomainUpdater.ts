import { err, ok, Result } from 'neverthrow';
import { Account, HorizonService } from './HorizonService';
import validator from 'validator';
import { injectable } from 'inversify';
import 'reflect-metadata';
import { queue } from 'async';
import { Node } from '@stellarbeat/js-stellar-domain';
import { isString } from '../utilities/TypeGuards';

interface CacheResult {
	domain: string | null;
	time: Date;
}

type PublicKey = string;
type HomeDomain = string | null;

@injectable()
export class HomeDomainUpdater {
	protected horizonService: HorizonService;
	protected cache: Map<PublicKey, CacheResult> = new Map<
		PublicKey,
		CacheResult
	>();

	static CacheTTL = 3600000; //1H cache

	constructor(horizonService: HorizonService) {
		this.horizonService = horizonService;
	}

	updateHomeDomains = async (nodes: Node[]) => {
		const domains = await this.fetchHomeDomains(
			nodes.map((node) => node.publicKey)
		);

		nodes.forEach((node) => {
			const domain = domains.get(node.publicKey);
			if (isString(domain)) node.homeDomain = domain;
		});

		return nodes;
	};

	fetchHomeDomains = async (publicKeys: PublicKey[]) => {
		const homeDomains: Map<PublicKey, HomeDomain> = new Map();
		const q = queue(async (publicKey: PublicKey, callback) => {
			const cachedDomain = this.getHomeDomainFromCache(publicKey);
			if (cachedDomain) {
				homeDomains.set(publicKey, cachedDomain.domain);
				callback();
				return;
			}

			const domainResult = await this.fetchDomain(publicKey);
			if (domainResult.isErr()) {
				//todo: do we need to report which nodes failed for whatever reason?
				console.log(
					'Info: Failed updating home domain for: ' +
						publicKey +
						' ' +
						domainResult.error.message
				);
				callback(domainResult.error);
				return;
			}

			this.addHomeDomainToCache(publicKey, domainResult.value);
			homeDomains.set(publicKey, domainResult.value);

			callback();
		}, 10);

		publicKeys.forEach((publicKey) => q.push(publicKey));

		await q.drain();

		return homeDomains;
	};

	async fetchDomain(
		publicKey: PublicKey
	): Promise<Result<string | null, Error>> {
		const accountResult = await this.horizonService.fetchAccount(publicKey);

		if (accountResult.isErr()) return err(accountResult.error);

		const account: Account | undefined = accountResult.value;

		if (account === undefined) return ok(null);

		if (account.home_domain === undefined) {
			return ok(null);
		}

		if (!validator.isFQDN(account.home_domain))
			return err(
				new Error(
					'Homedomain is not a correct domain name: ' + account.home_domain
				)
			);

		return ok(account.home_domain);
	}

	protected getHomeDomainFromCache(publicKey: PublicKey) {
		const cacheResult = this.cache.get(publicKey);
		if (!cacheResult) return undefined;

		if (
			cacheResult.time.getTime() + HomeDomainUpdater.CacheTTL <
			new Date().getTime()
		) {
			this.cache.delete(publicKey);
			return undefined;
		}

		return cacheResult;
	}

	protected addHomeDomainToCache(
		publicKey: PublicKey,
		homeDomain: string | null
	) {
		this.cache.set(publicKey, {
			domain: homeDomain,
			time: new Date()
		});
	}
}
