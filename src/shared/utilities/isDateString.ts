export function isDateString(dateString?: any) {
	if (dateString === undefined || dateString === null) return false;

	const timestamp = Date.parse(dateString);

	return !isNaN(timestamp);
}
