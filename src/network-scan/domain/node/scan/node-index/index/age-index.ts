/**
 * Age index. The more recent, the lower the value
 */
export class AgeIndex {
	static get(dateDiscovered: Date): number {
		const monthDifference = AgeIndex.monthDifference(
			dateDiscovered,
			new Date()
		);
		if (monthDifference > 6)
			//older then 6 months
			return 1;
		else return monthDifference / 6;
	}

	protected static monthDifference(date1: Date, date2: Date) {
		let months;
		months = (date2.getFullYear() - date1.getFullYear()) * 12;
		months -= date1.getMonth() + 1;
		months += date2.getMonth();
		return months <= 0 ? 0 : months;
	}
}
