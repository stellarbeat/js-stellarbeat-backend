import { SentryJobMonitor } from '../SentryJobMonitor';
import { MonitoringJob } from '../../../services/JobMonitor';

jest.mock('@sentry/node', () => ({
	init: jest.fn(),
	captureCheckIn: jest.fn(async () => {
		return 'id';
	})
}));

import * as Sentry from '@sentry/node';

describe('SentryJobMonitor', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should  monitor job', async () => {
		const sentryDSN = 'sentryDSN';
		const sentryJobMonitor = new SentryJobMonitor(sentryDSN);

		const startJob: MonitoringJob = {
			context: 'context',
			status: 'in_progress'
		};

		await sentryJobMonitor.checkIn(startJob);
		expect(Sentry.captureCheckIn).toHaveBeenCalledTimes(1);

		const result = await sentryJobMonitor.checkIn({
			context: 'context',
			status: 'ok'
		});

		expect(result.isOk()).toBe(true);
		expect(Sentry.captureCheckIn).toHaveBeenCalledTimes(2);
	});

	test('should return error if job is not started and marked as OK', async () => {
		const sentryDSN = 'sentryDSN';
		const sentryJobMonitor = new SentryJobMonitor(sentryDSN);

		const result = await sentryJobMonitor.checkIn({
			context: 'context',
			status: 'ok'
		});

		expect(result.isErr()).toBe(true);
	});

	test('should return error if Sentry returns error on captureCheckIn', async () => {
		const sentryDSN = 'sentryDSN';
		const sentryJobMonitor = new SentryJobMonitor(sentryDSN);

		(Sentry.captureCheckIn as jest.Mock).mockImplementationOnce(() => {
			throw new Error('error');
		});

		const result = await sentryJobMonitor.checkIn({
			context: 'context',
			status: 'in_progress'
		});

		expect(result.isErr()).toBe(true);
	});
});
