import { HasherPool } from './HasherPool';

export class WorkerPoolLoadTracker {
	private readonly loadTrackTimer: NodeJS.Timer;
	private poolFullCount = 0;
	private poolCheckIfFullCount = 0;

	constructor(workerPool: HasherPool, private maxPendingTasks: number) {
		this.loadTrackTimer = setInterval(() => {
			this.poolCheckIfFullCount++;
			if (this.workerPoolIsFull(workerPool))
				//pool 80 percent of max pending is considered full
				this.poolFullCount++;
		}, 10000);
	}

	private workerPoolIsFull(pool: HasherPool) {
		return pool.workerpool.stats().pendingTasks >= this.maxPendingTasks * 0.8;
	}

	getPoolFullPercentage() {
		return this.poolCheckIfFullCount > 0
			? Math.round((this.poolFullCount / this.poolCheckIfFullCount) * 100)
			: 0;
	}
	getPoolFullPercentagePretty() {
		return this.getPoolFullPercentage() + '%';
	}

	stop() {
		clearTimeout(this.loadTrackTimer);
	}
}
