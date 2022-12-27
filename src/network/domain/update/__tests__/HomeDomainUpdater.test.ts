import { HomeDomainUpdater } from '../HomeDomainUpdater';
import { HorizonService } from '../HorizonService';
import { ok } from 'neverthrow';
import { LoggerMock } from '../../../../core/services/__mocks__/LoggerMock';
import { HttpService } from '../../../../core/services/HttpService';

it('should update homeDomains once in a cache period', async function () {
	const horizonService = new HorizonService({} as HttpService, {
		value: 'url'
	});
	jest
		.spyOn(horizonService, 'fetchAccount')
		.mockResolvedValue(ok({ home_domain: 'myDomain.be' }));

	const domainUpdater = new HomeDomainUpdater(horizonService, new LoggerMock());
	const domains = await domainUpdater.fetchHomeDomains(['A']);
	expect(domains.get('A')).toEqual('myDomain.be');
	jest
		.spyOn(horizonService, 'fetchAccount')
		.mockResolvedValue(ok({ home_domain: 'myOtherDomain.be' }));
	await domainUpdater.fetchHomeDomains(['A']);
	expect(domains.get('A')).toEqual('myDomain.be');
});
