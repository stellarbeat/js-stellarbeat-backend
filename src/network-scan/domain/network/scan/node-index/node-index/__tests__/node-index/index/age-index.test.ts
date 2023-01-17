import { AgeIndex } from '../../../index/age-index';

test('get', () => {
	expect(AgeIndex.get(new Date())).toEqual(0);
	let newDate = new Date();
	newDate.setMonth(newDate.getMonth() - 3);
	expect(AgeIndex.get(newDate)).toEqual(2 / 6);

	newDate = new Date();
	newDate.setMonth(newDate.getMonth() - 8);
	expect(AgeIndex.get(newDate)).toEqual(1);
});
