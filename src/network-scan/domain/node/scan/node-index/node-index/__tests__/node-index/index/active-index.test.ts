import { ActiveIndex } from '../../../index/active-index';

test('get', () => {
	expect(ActiveIndex.get(100)).toEqual(1);
	expect(ActiveIndex.get(50)).toEqual(0.5);
});
