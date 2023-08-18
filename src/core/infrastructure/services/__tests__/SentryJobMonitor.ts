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
			key: 'key',
			context: 'context',
			status: 'in_progress'
		};

		await sentryJobMonitor.checkIn(startJob);
		expect(Sentry.captureCheckIn).toHaveBeenCalledTimes(1);

		await sentryJobMonitor.checkIn({
			key: 'key',
			context: 'context',
			status: 'ok'
		});

		expect(Sentry.captureCheckIn).toHaveBeenCalledTimes(2);
	});

	test('should throw error if job is not started', async () => {
		const sentryDSN = 'sentryDSN';
		const sentryJobMonitor = new SentryJobMonitor(sentryDSN);

		await expect(
			sentryJobMonitor.checkIn({
				key: 'key',
				context: 'context',
				status: 'ok'
			})
		).rejects.toThrowError(
			'Cannot check in or fail a job that has not been started'
		);
	});
});
