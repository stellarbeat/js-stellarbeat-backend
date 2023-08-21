import { inject, injectable } from 'inversify';
import { JobMonitor, MonitoringJob } from '../../services/JobMonitor';
import { Logger } from '../../services/PinoLogger';
import 'reflect-metadata';
import { ok } from 'neverthrow';

@injectable()
export class LoggerJobMonitor implements JobMonitor {
	constructor(@inject('Logger') private logger: Logger) {}

	async checkIn(job: MonitoringJob) {
		this.logger.info('Job check-in', {
			job
		});

		return ok(undefined);
	}
}
