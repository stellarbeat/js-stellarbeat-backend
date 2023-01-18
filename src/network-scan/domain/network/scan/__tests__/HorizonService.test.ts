import { HorizonService } from '../HorizonService';
import { Node } from '@stellarbeat/js-stellarbeat-shared';
import { Url } from '../../../../../core/domain/Url';
import { mock } from 'jest-mock-extended';
import { HttpService } from '../../../../../core/services/HttpService';
import { err, ok } from 'neverthrow';

const node = new Node(
	'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
);

let horizonService: HorizonService;
const httpService = mock<HttpService>();

beforeAll(() => {
	const horizonUrl = Url.create('https://horizon.stellar.org');
	expect(horizonUrl.isOk());
	if (!horizonUrl.isOk()) return;
	horizonService = new HorizonService(httpService, horizonUrl.value);
});

test('fetchAccount', async () => {
	httpService.get.mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: { home_domain: 'my-domain.net' },
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);
	const result = await horizonService.fetchAccount(node.publicKey);
	expect(result.isOk()).toBeTruthy();
	if (result.isOk())
		expect(result.value).toEqual({ home_domain: 'my-domain.net' });
});

test('fetchAccountError', async () => {
	httpService.get.mockReturnValue(
		new Promise((resolve) => resolve(err(new Error('Horizon down'))))
	);

	const result = await horizonService.fetchAccount(node.publicKey);
	expect(result.isErr()).toBeTruthy();
});
