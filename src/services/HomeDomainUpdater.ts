import {err, ok, Result} from "neverthrow";
import {Node, PublicKey} from "@stellarbeat/js-stellar-domain";
import {Account, HorizonService} from "../horizon-service";
import validator from "validator";
import {injectable} from "inversify";
import "reflect-metadata";
import {queue} from "async";

interface CacheResult {
    domain: string;
    time: Date;
}

@injectable()
export class HomeDomainUpdater {

    protected horizonService: HorizonService;
    protected cache: Map<PublicKey, CacheResult> = new Map<PublicKey, CacheResult>();

    static CacheTTL = 43200000; //12H cache

    constructor(horizonService: HorizonService) {
        this.horizonService = horizonService;
    }

    updateHomeDomains = async (nodes: Node[]) => {
        let q = queue(async (node: Node, callback) => {
            let domain: string | undefined = this.getHomeDomainFromCache(node.publicKey);
            if (!domain) {
                const domainResult = await this.fetchDomain(node.publicKey);
                if (domainResult.isErr()) {
                    //todo: do we need to report which nodes failed for whatever reason?
                    console.log("Info: Failed updating home domain for: " + node.displayName + " " + domainResult.error.message);
                    callback();
                    return;
                } else{
                    domain = domainResult.value;
                }
            }
            if (domain){
                this.addHomeDomainToCache(node.publicKey, domain);
                node.homeDomain = domain;
            }
            callback();
        }, 10);

        nodes.filter(node => node.active).forEach(node => q.push(node));

        await q.drain();
    }

    async fetchDomain(publicKey: PublicKey): Promise<Result<string | undefined, Error>> {
        const accountResult = await this.horizonService.fetchAccount(publicKey);

        if(accountResult.isErr())
            return err(accountResult.error);

        const account: Account | undefined = accountResult.value;

        if (account === undefined)
            return ok(undefined);

        if (account.home_domain === undefined) {
            return ok(undefined);
        }

        if (!validator.isFQDN(account.home_domain))
            return err(new Error("Homedomain is not a correct domain name: " + account.home_domain));

        return ok(account.home_domain);

    }

    protected getHomeDomainFromCache(publicKey: PublicKey) {
        let cacheResult = this.cache.get(publicKey);
        if (!cacheResult)
            return undefined;

        if (cacheResult.time.getTime() + HomeDomainUpdater.CacheTTL < new Date().getTime()) {
            this.cache.delete(publicKey);
            return undefined;
        }

        return cacheResult.domain;
    }

    protected addHomeDomainToCache(publicKey: PublicKey, homeDomain: string) {
        this.cache.set(publicKey, {
            domain: homeDomain,
            time: new Date()
        })
    }

}