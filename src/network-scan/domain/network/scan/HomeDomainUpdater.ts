import { err, ok, Result } from 'neverthrow';
import { Account, HorizonService } from './HorizonService';
import validator from 'validator';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { queue } from 'async';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { isString } from '../../../../core/utilities/TypeGuards';
import { CustomError } from '../../../../core/errors/CustomError';
import { Logger } from '../../../../core/services/PinoLogger';

interface CacheResult {
	domain: string | null;
	time: Date;
}

type PublicKey = string;
type HomeDomain = string | null;

export class UpdateHomeDomainError extends CustomError {
	constructor(publicKey: string, cause?: Error) {
		super(
			'Failed updating homeDomain for ' + publicKey,
			UpdateHomeDomainError.name,
			cause
		);
	}
}

@injectable()
export class HomeDomainUpdater {
	protected cache: Map<PublicKey, CacheResult> = new Map<
		PublicKey,
		CacheResult
	>();

	static CacheTTL = 3600000; //1H cache

	constructor(
		protected horizonService: HorizonService,
		@inject('Logger') protected logger: Logger
	) {}

	updateHomeDomains = async (nodes: NodeDTO[]) => {
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
			const domainResult = await this.fetchDomain(publicKey);
			if (domainResult.isErr()) {
				//todo: do we need to report which nodes failed for whatever reason?
				this.logger.info(domainResult.error.message);
				callback();
				return;
			}

			homeDomains.set(publicKey, domainResult.value);

			callback();
		}, 10);

		publicKeys.forEach((publicKey) => q.push(publicKey));

		await q.drain();

		return homeDomains;
	};

	async fetchDomain(
		publicKey: PublicKey
	): Promise<Result<string | null, UpdateHomeDomainError>> {
		const cachedDomain = this.getHomeDomainFromCache(publicKey);
		if (cachedDomain) {
			return ok(cachedDomain.domain);
		}
		const accountResult = await this.horizonService.fetchAccount(publicKey);

		if (accountResult.isErr())
			return err(new UpdateHomeDomainError(publicKey, accountResult.error));

		const account: Account | undefined = accountResult.value;

		if (account === undefined) {
			this.addHomeDomainToCache(publicKey, null);
			return ok(null);
		}

		if (account.home_domain === undefined) {
			this.addHomeDomainToCache(publicKey, null);
			return ok(null);
		}

		if (!validator.isFQDN(account.home_domain))
			return err(
				new UpdateHomeDomainError(
					publicKey,
					new Error('Homedomain is not a correct FQDN: ' + account.home_domain)
				)
			);

		this.addHomeDomainToCache(publicKey, account.home_domain);
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
