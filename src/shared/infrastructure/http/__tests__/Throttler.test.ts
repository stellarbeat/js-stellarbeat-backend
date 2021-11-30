import { Throttler } from '../Throttler';

it('should throttle when too many requests in time window', function () {
	const throttler = new Throttler(2, 1000 * 60);
	const ip = 'localhost';
	throttler.processRequest(ip, new Date());
	expect(throttler.throttled(ip)).toBeFalsy();
	throttler.processRequest(ip, new Date());
	expect(throttler.throttled(ip)).toBeFalsy();
	throttler.processRequest(ip, new Date());
	expect(throttler.throttled(ip)).toBeTruthy();

	const otherIp = 'other';
	throttler.processRequest(otherIp, new Date());
	expect(throttler.throttled(otherIp)).toBeFalsy();
});

it('should not throttle when max requests span multiple time windows', function () {
	const timeWindow = 1000 * 60;
	const throttler = new Throttler(1, timeWindow);

	const startTime = new Date();
	const ip = 'localhost';
	throttler.processRequest(ip, startTime);
	expect(throttler.throttled(ip)).toBeFalsy();

	throttler.processRequest(ip, new Date(startTime.getTime() + timeWindow + 1));
	expect(throttler.throttled(ip)).toBeFalsy();
});
