export function sortDescending(myArray: number[]) {
	return [...myArray].sort((a, b) => b - a);
}
