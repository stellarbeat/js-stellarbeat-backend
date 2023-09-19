import * as LRUCache from 'lru-cache';

export type Throttle = {
	startTime: number;
	count: number;
};

export class Throttler {
	protected cache: LRUCache<string, Throttle>;

	constructor(protected maxRequestCount: number, protected timeWindow: number) {
		this.cache = new LRUCache<string, Throttle>({
			max: 10000,
			ttl: timeWindow * maxRequestCount
		});
	}

	processRequest(ip: string, at: Date): void {
		const throttle = this.cache.get(ip);
		if (!throttle) {
			this.cache.set(ip, {
				startTime: at.getTime(),
				count: 1
			});
		} else if (at.getTime() - throttle.startTime >= this.timeWindow) {
			this.cache.set(ip, {
				startTime: at.getTime(),
				count: 1
			});
		} else {
			throttle.count++;
			this.cache.set(ip, throttle);
		}
	}

	throttled(ip: string): boolean {
		const throttle = this.cache.get(ip);
		if (!throttle) return false;

		return throttle.count > this.maxRequestCount;
	}
}
