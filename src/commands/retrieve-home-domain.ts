// eslint-disable-next-line @typescript-eslint/no-var-requires
import { HomeDomainUpdater } from '../services/HomeDomainUpdater';
import { HorizonService } from '../services/HorizonService';
// noinspection JSIgnoredPromiseFromCall
import { getConfigFromEnv } from '../config';

main();

async function main() {
	if (process.argv.length <= 2) {
		console.log('Usage: ' + __filename + ' PUBLIC KEY');

		process.exit(-1);
	}
	const publicKey = process.argv[2];

	const configResult = getConfigFromEnv();
	if (configResult.isErr()) {
		console.log(configResult.error.message);
		return;
	}

	const horizonService = new HorizonService(configResult.value.horizonUrl);
	const homeDomainUpdater = new HomeDomainUpdater(horizonService);

	const domainResult = await homeDomainUpdater.fetchDomain(publicKey);
	if (domainResult.isOk()) console.log(domainResult.value);
	else console.log(domainResult.error.message);
}
