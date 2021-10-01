import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { HorizonService } from '../../src';
import { Node } from '@stellarbeat/js-stellar-domain';

jest.mock('axios');

const node = new Node(
	'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
);

test('fetchAccount', async () => {
	const horizonService = new HorizonService();
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
	const horizonService = new HorizonService();
	(axios.get as any).mockImplementation(() => {
		throw new Error('horizon down');
	});

	const result = await horizonService.fetchAccount(node.publicKey);
	expect(result.isErr()).toBeTruthy();
});
