// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import { HistoryService } from '../../src';
import axios from 'axios';

jest.mock('axios');

const stellarHistoryJson =
	'{\n' +
	'    "version": 1,\n' +
	'    "server": "v10.2.0-64-g89f2ba32",\n' +
	'    "currentLedger": 23586760,\n' +
	'    "currentBuckets": [\n' +
	'        {\n' +
	'            "curr": "e7984e605971d07352e4eda31a61c4e25bc0d8c5bab28e2731639534a1b813a1",\n' +
	'            "next": {\n' +
	'                "state": 0\n' +
	'            },\n' +
	'            "snap": "bb88aeb1a3418126682c52aaf3b88fae1fb3cd1df47aa6901c8d7fc172fa9ad8"\n' +
	'        }]}';

test('fetchStellarHistory', async () => {
	const historyService = new HistoryService();

	jest
		.spyOn(axios, 'get')
		//@ts-ignore
		.mockReturnValue({ data: JSON.parse(stellarHistoryJson) });
	//@ts-ignore
	jest.spyOn(axios.CancelToken, 'source').mockReturnValue({ token: 'token' });
	const result = await historyService.fetchStellarHistory(
		'https://stellar.sui.li/history/'
	);
	expect(result.isOk()).toBeTruthy();
	if (result.isErr()) return;
	expect(result.value).toEqual(JSON.parse(stellarHistoryJson));
});

test('getCurrentLedger', () => {
	const historyService = new HistoryService();

	const result = historyService.getCurrentLedger(
		JSON.parse(stellarHistoryJson)
	);
	expect(result.isOk());
	if (result.isErr()) return;
	expect(result.value).toEqual(23586760);
	expect(historyService.getCurrentLedger({}).isErr()).toBeTruthy();
});

test('stellarHistoryIsUpToDate', async () => {
	const historyService = new HistoryService();

	(axios.get as any).mockImplementationOnce(() =>
		Promise.resolve({ data: JSON.parse(stellarHistoryJson) })
	);
	//@ts-ignore
	jest.spyOn(axios.CancelToken, 'source').mockReturnValue({ token: 'token' });
	expect(
		await historyService.stellarHistoryIsUpToDate(
			'https://stellar.sui.li/history/',
			'23586800'
		)
	).toEqual(true);
});

test('stellarHistoryIsNotUpToDate', async () => {
	const historyService = new HistoryService();
	(axios.get as any).mockImplementationOnce(() =>
		Promise.resolve({ data: JSON.parse(stellarHistoryJson) })
	);
	//@ts-ignore
	jest.spyOn(axios.CancelToken, 'source').mockReturnValue({ token: 'token' });

	expect(
		await historyService.stellarHistoryIsUpToDate(
			'https://stellar.sui.li/history/',
			'25586760'
		)
	).toEqual(false);
});
