export default (dateToCheck: Date, baseDate?: Date) => {
	if (!baseDate) baseDate = new Date();

	let yesterday = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);

	return dateToCheck.getTime() < yesterday.getTime();
};
