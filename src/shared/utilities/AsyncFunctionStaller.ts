export async function stall<Args extends unknown[], Return>(
	minTimeMs: number,
	operation: (...operationParameters: Args) => Return,
	...parameters: Args
): Promise<Return> {
	const time = new Date().getTime();
	const result = await operation(...parameters);
	const elapsed = new Date().getTime() - time;
	if (elapsed < minTimeMs) await sleep(minTimeMs - elapsed);
	return result;
}

async function sleep(time: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
}
