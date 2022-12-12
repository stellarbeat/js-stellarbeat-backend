import { stall } from '../AsyncFunctionStaller';

it('should stall a fast async function', async function () {
	const increaseWithOneAsync = async (nr: number) => {
		return new Promise<number>((resolve) => {
			nr++;
			setImmediate(() => resolve(nr));
		});
	};

	const time = new Date().getTime();
	const result = await stall(51, increaseWithOneAsync, 1);
	const elapsed = new Date().getTime() - time;

	expect(result).toEqual(2);
	expect(elapsed).toBeGreaterThan(50);
});
