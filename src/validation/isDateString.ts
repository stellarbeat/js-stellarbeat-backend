export function isDateString(dateString?: any) {
	if (dateString === undefined || dateString === null) return false;

	let timestamp = Date.parse(dateString);

	return !isNaN(timestamp);
}
