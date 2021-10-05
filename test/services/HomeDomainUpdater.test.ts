import { HomeDomainUpdater } from '../../src/services/HomeDomainUpdater';
import { HorizonService } from '../../src/services/HorizonService';
import { ok } from 'neverthrow';

it('should update homeDomains once in a cache period', async function () {
	const horizonService = new HorizonService({ value: 'url' });
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
