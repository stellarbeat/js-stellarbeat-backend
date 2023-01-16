import olderThanOneDay from '../MoreThanOneDayApart';

test('older', () => {
	const myDate = new Date(1999, 1, 1);
	const olderDate = new Date(1998, 1, 1);
	expect(olderThanOneDay(myDate, olderDate)).toBeTruthy();
	expect(olderThanOneDay(olderDate, myDate)).toBeTruthy();
});

test('not older', () => {
	const timeA = new Date(1999, 1, 1);
	const timeB = new Date(1999, 1, 1, 1);
	expect(olderThanOneDay(timeA, timeB)).toBeFalsy();
	expect(olderThanOneDay(timeB, timeB)).toBeFalsy();
});
