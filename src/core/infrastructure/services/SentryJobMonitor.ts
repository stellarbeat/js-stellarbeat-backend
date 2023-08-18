import * as Sentry from '@sentry/node';
import { injectable } from 'inversify';
import { JobMonitor, MonitoringJob } from '../../services/JobMonitor';
import 'reflect-metadata';

@injectable()
export class SentryJobMonitor implements JobMonitor {
	private sentryIdToJobKeyMap: Map<string, string> = new Map();

	constructor(sentryDSN: string) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	async checkIn(job: MonitoringJob) {
		const checkInId = this.sentryIdToJobKeyMap.get(job.key);
		if ((!checkInId && job.status === 'ok') || job.status === 'error') {
			throw new Error(
				'Cannot check in or fail a job that has not been started'
			);
		}

		if (!checkInId) {
			const newCheckInId = Sentry.captureCheckIn({
				monitorSlug: job.context,
				status: 'in_progress'
			});
			this.sentryIdToJobKeyMap.set(job.key, newCheckInId);
		} else {
			Sentry.captureCheckIn({
				monitorSlug: job.context,
				status: job.status,
				checkInId: checkInId
			});
		}
	}
}
