export default (dateToCheck: Date, baseDate?: Date): boolean => {
	if (!baseDate) baseDate = new Date();

	const yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);

	return dateToCheck.getTime() < yesterday.getTime();
};
