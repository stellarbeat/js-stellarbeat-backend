import { ok } from 'neverthrow';
import { HistoryService } from '../history/HistoryService';
import { LoggerMock } from '../../../shared/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { HttpService } from '../../../shared/services/HttpService';
import { HistoryArchiveScanService } from '../history/HistoryArchiveScanService';
import { Node } from '@stellarbeat/js-stellar-domain';
import { HistoryArchiveScan } from '../../../network/domain/HistoryArchiveScan';

const httpService = mock<HttpService>();
const historyArchiveScanService = mock<HistoryArchiveScanService>();

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
	const historyService = new HistoryService(
		httpService,
		historyArchiveScanService,
		new LoggerMock()
	);
	httpService.get.mockReturnValue(
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
	const historyService = new HistoryService(
		httpService,
		historyArchiveScanService,
		new LoggerMock()
	);
	httpService.get.mockReturnValue(
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
	const historyService = new HistoryService(
		httpService,
		historyArchiveScanService,
		new LoggerMock()
	);
	httpService.get.mockReturnValue(
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

it('should update historyGaps', async function () {
	const historyService = new HistoryService(
		httpService,
		historyArchiveScanService,
		new LoggerMock()
	);
	const nodeWithGap = new Node('GAP');
	nodeWithGap.historyUrl = 'https://gap.co';

	const nodeWithoutGap = new Node('NOGAP');
	nodeWithoutGap.historyUrl = 'https://nogap.co';

	const nodeNoHistory = new Node('NOHISTORY');

	historyArchiveScanService.findLatestScans.mockReturnValue(
		new Promise((resolve) => {
			resolve(
				ok([
					new HistoryArchiveScan('https://gap.co', new Date(), 10, true),
					new HistoryArchiveScan('https://nogap.co', new Date(), 10, false)
				])
			);
		})
	);

	const result = await historyService.updateGaps([
		nodeWithGap,
		nodeWithoutGap,
		nodeNoHistory
	]);
	if (result.isErr()) throw result.error;

	const nodesWithGaps = result.value.filter((node) => node.historyArchiveGap);
	expect(nodesWithGaps.length).toEqual(1);
	expect(nodesWithGaps[0].publicKey).toEqual('GAP');
});
