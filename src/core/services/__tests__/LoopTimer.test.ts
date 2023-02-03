import { asyncSleep } from '../../utilities/asyncSleep';
import { LoopTimer } from '../LoopTimer';

describe('LoopTimer', () => {
	it('should time a loop', async function () {
		const maxTime = 20000;
		const sleepTime = 100;
		const loopTimer = new LoopTimer();
		loopTimer.start(maxTime);
		await asyncSleep(sleepTime);
		loopTimer.stop();
		expect(loopTimer.getElapsedTime()).toBeGreaterThanOrEqual(sleepTime);
		expect(loopTimer.getElapsedTime()).toBeLessThanOrEqual(maxTime);
		expect(loopTimer.loopExceededMaxTime()).toBe(false);
		expect(loopTimer.getRemainingTime()).toBeLessThanOrEqual(
			maxTime - sleepTime
		);
	});

	it('should detect if loop exceeded max time', async function () {
		const maxTime = 50;
		const sleepTime = 100;
		const loopTimer = new LoopTimer();
		loopTimer.start(maxTime);
		await asyncSleep(sleepTime);
		loopTimer.stop();
		expect(loopTimer.loopExceededMaxTime()).toBe(true);
		expect(loopTimer.getRemainingTime()).toBeLessThanOrEqual(0);
	});

	it('should throw if timer not started', function () {
		const loopTimer = new LoopTimer();
		expect(() => loopTimer.stop()).toThrow();
		expect(() => loopTimer.getElapsedTime()).toThrow();
		expect(() => loopTimer.loopExceededMaxTime()).toThrow();
		expect(() => loopTimer.getRemainingTime()).toThrow();
	});

	it('should throw if timer not stopped', function () {
		const loopTimer = new LoopTimer();
		loopTimer.start();
		expect(() => loopTimer.start()).toThrow();
		expect(() => loopTimer.getElapsedTime()).toThrow();
		expect(() => loopTimer.loopExceededMaxTime()).toThrow();
		expect(() => loopTimer.getRemainingTime()).toThrow();
	});
});
