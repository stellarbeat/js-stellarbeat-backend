require('dotenv').config();
import { HomeDomainUpdater } from '../services/HomeDomainUpdater';
import { HorizonService } from '../horizon-service';
// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	if (process.argv.length <= 2) {
		console.log('Usage: ' + __filename + ' PUBLIC KEY');

		process.exit(-1);
	}
	const publicKey = process.argv[2];

	const horizonService = new HorizonService();
	const homeDomainUpdater = new HomeDomainUpdater(horizonService);

	let domainResult = await homeDomainUpdater.fetchDomain(publicKey);
	if (domainResult.isOk()) console.log(domainResult.value);
	else console.log(domainResult.error.message);
}
