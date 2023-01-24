// eslint-disable-next-line @typescript-eslint/no-var-requires
import { HomeDomainFetcher } from '../../domain/node/scan/HomeDomainFetcher';
import { HorizonService } from '../../domain/network/scan/HorizonService';
// noinspection JSIgnoredPromiseFromCall
import { getConfigFromEnv } from '../../../core/config/Config';
import { PinoLogger } from '../../../core/services/PinoLogger';
import { AxiosHttpService } from '../../../core/infrastructure/http/AxiosHttpService';

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

	const horizonService = new HorizonService(
		new AxiosHttpService('test'),
		configResult.value.horizonUrl
	);
	const homeDomainUpdater = new HomeDomainFetcher(
		horizonService,
		new PinoLogger()
	);

	const domainResult = await homeDomainUpdater.fetchDomain(publicKey);
	if (domainResult.isOk()) console.log(domainResult.value);
	else console.log(domainResult.error.message);
}
