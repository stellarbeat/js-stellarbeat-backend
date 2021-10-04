import { HomeDomainUpdater } from '../../src/services/HomeDomainUpdater';
import { HorizonService } from '../../src';
import { ok } from 'neverthrow';

it('should update homeDomains once in a cache period', async function () {
	process.env.HORIZON_URL = 'lol';
	const horizonService = new HorizonService();
	jest
		.spyOn(horizonService, 'fetchAccount')
		.mockResolvedValue(ok({ home_domain: 'myDomain.be' }));

	const domainUpdater = new HomeDomainUpdater(horizonService);
	const domains = await domainUpdater.fetchHomeDomains(['A']);
	expect(domains.get('A')).toEqual('myDomain.be');
	jest
		.spyOn(horizonService, 'fetchAccount')
		.mockResolvedValue(ok({ home_domain: 'myOtherDomain.be' }));
	await domainUpdater.fetchHomeDomains(['A']);
	expect(domains.get('A')).toEqual('myDomain.be');
});
