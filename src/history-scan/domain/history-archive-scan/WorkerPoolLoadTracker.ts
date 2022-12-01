import { CategoryScanner, HasherPool } from './CategoryScanner';

export class WorkerPoolLoadTracker {
	private readonly loadTrackTimer: NodeJS.Timer;
	private poolFullCount = 0;
	private poolCheckIfFullCount = 0;

	constructor(workerPool: HasherPool) {
		this.loadTrackTimer = setInterval(() => {
			this.poolCheckIfFullCount++;
			if (WorkerPoolLoadTracker.workerPoolIsFull(workerPool))
				//pool 80 percent of max pending is considered full
				this.poolFullCount++;
		}, 10000);
	}

	private static workerPoolIsFull(pool: HasherPool) {
		return (
			pool.workerpool.stats().pendingTasks >=
			CategoryScanner.POOL_MAX_PENDING_TASKS * 0.8
		);
	}

	getPoolFullPercentagePretty() {
		return this.poolCheckIfFullCount > 0
			? Math.round((this.poolFullCount / this.poolCheckIfFullCount) * 100) + '%'
			: '0%';
	}

	stop() {
		clearTimeout(this.loadTrackTimer);
	}
}
