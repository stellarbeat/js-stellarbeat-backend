export async function asyncSleep(time: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
}
