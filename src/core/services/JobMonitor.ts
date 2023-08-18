export interface MonitoringJob {
	key: string;
	context: string;
	status: 'in_progress' | 'ok' | 'error';
}

export interface JobMonitor {
	checkIn(job: MonitoringJob): Promise<void>;
}
