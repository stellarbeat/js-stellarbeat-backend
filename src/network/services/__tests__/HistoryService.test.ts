// eslint-disable-next-line @typescript-eslint/no-var-requires
import { ok } from 'neverthrow';
import { HistoryService } from '../HistoryService';
import { AxiosHttpService } from '../../../shared/services/HttpService';
import { LoggerMock } from '../../../shared/services/__mocks__/LoggerMock';

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
	const axiosHttpService = new AxiosHttpService('test');
	const historyService = new HistoryService(axiosHttpService, new LoggerMock());
	jest.spyOn(axiosHttpService, 'get').mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: JSON.parse(stellarHistoryJson),
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);

	const result = await historyService.fetchStellarHistoryLedger(
		'https://stellar.sui.li/history/'
	);
	expect(result.isOk()).toBeTruthy();
	if (result.isErr()) return;
	expect(result.value).toEqual(23586760);
});

test('stellarHistoryIsUpToDate', async () => {
	const axiosHttpService = new AxiosHttpService('test');
	const historyService = new HistoryService(axiosHttpService, new LoggerMock());
	jest.spyOn(axiosHttpService, 'get').mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: JSON.parse(stellarHistoryJson),
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);

	expect(
		await historyService.stellarHistoryIsUpToDate(
			'https://stellar.sui.li/history/',
			'23586800'
		)
	).toEqual(true);
});

test('stellarHistoryIsNotUpToDate', async () => {
	const axiosHttpService = new AxiosHttpService('test');
	const historyService = new HistoryService(axiosHttpService, new LoggerMock());
	jest.spyOn(axiosHttpService, 'get').mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: JSON.parse(stellarHistoryJson),
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);

	expect(
		await historyService.stellarHistoryIsUpToDate(
			'https://stellar.sui.li/history/',
			'25586760'
		)
	).toEqual(false);
});
