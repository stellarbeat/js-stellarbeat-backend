import axios from 'axios';
import { HorizonService, HorizonUrl } from '../../src/services/HorizonService';
import { Node } from '@stellarbeat/js-stellar-domain';

jest.mock('axios');

const node = new Node(
	'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
);

let horizonService: HorizonService;

beforeAll(() => {
	const horizonUrl = HorizonUrl.create('https://horizon.stellar.org');
	expect(horizonUrl.isOk());
	if (!horizonUrl.isOk()) return;
	horizonService = new HorizonService(horizonUrl.value);
});

test('fetchAccount', async () => {
	//@ts-ignore
	jest.spyOn(axios.CancelToken, 'source').mockReturnValue({ token: 'token' });
	jest
		.spyOn(axios, 'get')
		//@ts-ignore
		.mockReturnValue({ data: { home_domain: 'my-domain.net' } });
	const result = await horizonService.fetchAccount(node.publicKey);
	expect(result.isOk()).toBeTruthy();
	if (result.isOk())
		expect(result.value).toEqual({ home_domain: 'my-domain.net' });
});

test('fetchAccountError', async () => {
	(axios.get as any).mockImplementation(() => {
		throw new Error('horizon down');
	});

	const result = await horizonService.fetchAccount(node.publicKey);
	expect(result.isErr()).toBeTruthy();
});
