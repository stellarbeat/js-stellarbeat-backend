export const getMaximumNumber = (arrayOfNumbers: Array<number>) => {
	return arrayOfNumbers.reduce(
		(max, currentNumber) => (max >= currentNumber ? max : currentNumber),
		-Infinity
	);
};
