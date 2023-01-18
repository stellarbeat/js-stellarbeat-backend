import { TypeIndex } from '../../../index/type-index';

test('get', () => {
	expect(TypeIndex.get(false, false)).toEqual(0.3);
	expect(TypeIndex.get(false, true)).toEqual(0.7);
	expect(TypeIndex.get(true, true)).toEqual(1);
});
