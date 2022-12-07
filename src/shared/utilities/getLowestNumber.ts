//works for large arrays
export function getLowestNumber(numbers: number[]): number {
	let lowest = Number.MAX_SAFE_INTEGER;
	for (const nr of numbers) {
		if (nr < lowest) lowest = nr;
	}
	return lowest;
}
