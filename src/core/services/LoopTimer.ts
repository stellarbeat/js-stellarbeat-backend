import { injectable } from 'inversify';
import 'reflect-metadata';

@injectable()
export class LoopTimer {
	private startTime?: number;
	private endTime?: number;
	private idle = true;
	private loopTime = 1000 * 60 * 3;

	start(loopTime?: number) {
		if (!this.idle) throw new Error('Timer already started');
		if (loopTime) this.loopTime = loopTime;
		this.startTime = Date.now();
		this.idle = false;
	}

	stop() {
		if (this.idle) throw new Error('Timer not started');
		this.endTime = Date.now();
		this.idle = true;
	}

	getElapsedTime(): number {
		if (!this.startTime || !this.endTime)
			throw new Error('Timer not started and stopped');
		return this.endTime - this.startTime;
	}

	getRemainingTime(): number {
		return this.loopTime - this.getElapsedTime();
	}

	loopExceededMaxTime(): boolean {
		return this.getElapsedTime() > this.loopTime;
	}
}
