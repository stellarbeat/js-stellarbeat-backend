import { WorkerPool } from 'workerpool';
import * as workerpool from 'workerpool';
import * as os from 'os';

export class HasherPool {
	public workerpool: WorkerPool;

	public terminated = false;
	constructor() {
		try {
			require(__dirname + '/hash-worker.import.js');
			this.workerpool = workerpool.pool(__dirname + '/hash-worker.import.js', {
				minWorkers: Math.max((os.cpus().length || 4) - 1, 1)
			});
		} catch (e) {
			this.workerpool = workerpool.pool(__dirname + '/hash-worker.js', {
				minWorkers: Math.max((os.cpus().length || 4) - 1, 1)
			});
		}
	}
}

export interface HasherPool {
	terminated: boolean;
	workerpool: WorkerPool;
}
