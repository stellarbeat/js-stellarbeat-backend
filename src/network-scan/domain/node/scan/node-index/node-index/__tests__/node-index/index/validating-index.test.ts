import { ValidatingIndex } from '../../../index/validating-index';

test('get', () => {
	expect(ValidatingIndex.get(100)).toEqual(1);
	expect(ValidatingIndex.get(50)).toEqual(0.5);
});
