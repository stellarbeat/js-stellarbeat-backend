import { ArchivePerformanceTester } from '../ArchivePerformanceTester';
import { CheckPointGenerator } from '../../check-point/CheckPointGenerator';
import { StandardCheckPointFrequency } from '../../check-point/StandardCheckPointFrequency';
import { mock } from 'jest-mock-extended';
import { HttpQueue } from '../../../../shared/services/HttpQueue';
import { createDummyHistoryBaseUrl } from '../../history-archive/__fixtures__/HistoryBaseUrl';
import { ok } from 'neverthrow';

it('should use cache busting', async function () {
	const httpQueue = mock<HttpQueue>();
	httpQueue.sendRequests.mockResolvedValue(ok(undefined));

	const tester = new ArchivePerformanceTester(
		new CheckPointGenerator(new StandardCheckPointFrequency()),
		httpQueue
	);
	await tester.determineOptimalConcurrency(
		createDummyHistoryBaseUrl(),
		100,
		false,
		[50]
	);

	expect(httpQueue.sendRequests).toHaveBeenCalledTimes(2);
	expect(httpQueue.sendRequests.mock.calls[0][1].cacheBusting).toBeTruthy();
	expect(httpQueue.sendRequests.mock.calls[1][1].cacheBusting).toBeTruthy();
});
