import { HttpQueue, RequestMethod } from '../HttpQueue';
import { mock } from 'jest-mock-extended';
import { LoggerMock } from '../../../shared/services/__mocks__/LoggerMock';
import { HttpService } from '../../../shared/services/HttpService';
import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { ok } from 'neverthrow';

it('should bust cache', async function () {
	const httpService = mock<HttpService>();
	httpService.get.mockResolvedValue(
		ok({ status: 200, data: [], statusText: 'ok', headers: {} })
	);
	const httpQueue = new HttpQueue(httpService, new LoggerMock());

	await httpQueue.sendRequests(
		[
			{
				url: createDummyHistoryBaseUrl(),
				meta: {},
				method: RequestMethod.GET
			}
		][Symbol.iterator](),
		{
			cacheBusting: true,
			concurrency: 1,
			rampUpConnections: false,
			nrOfRetries: 0,
			stallTimeMs: 100,
			httpOptions: {}
		}
	);

	expect(httpService.get).toHaveBeenCalledTimes(1);
	expect(
		httpService.get.mock.calls[0][0].value.indexOf('bust') > 0
	).toBeTruthy();
});
