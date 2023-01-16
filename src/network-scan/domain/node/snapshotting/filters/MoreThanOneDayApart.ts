export default (timeA: Date, timeB: Date): boolean => {
	return Math.abs(timeA.getTime() - timeB.getTime()) > 1000 * 60 * 60 * 24;
};
