import * as Sentry from '@sentry/node';
import { injectable } from 'inversify';
import { JobMonitor, MonitoringJob } from '../../services/JobMonitor';
import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../utilities/mapUnknownToError';

@injectable()
export class SentryJobMonitor implements JobMonitor {
	private checkInId: string | null = null;

	constructor(sentryDSN: string) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	async checkIn(job: MonitoringJob): Promise<Result<void, Error>> {
		try {
			if (job.status === 'in_progress') {
				this.checkInId = Sentry.captureCheckIn({
					monitorSlug: job.context,
					status: job.status
				});

				return ok(undefined);
			}

			if (!this.checkInId) {
				return err(
					new Error('Cannot check in or fail a job that has not been started')
				);
			}

			Sentry.captureCheckIn({
				monitorSlug: job.context,
				status: job.status,
				checkInId: this.checkInId
			});
			this.checkInId = null;

			return ok(undefined);
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
