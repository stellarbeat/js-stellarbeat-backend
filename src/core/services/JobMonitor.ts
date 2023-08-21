import { Result } from 'neverthrow';

export interface MonitoringJob {
	context: string;
	status: 'in_progress' | 'ok' | 'error';
}

export interface JobMonitor {
	checkIn(job: MonitoringJob): Promise<Result<void, Error>>;
}
