import { OrganizationValidators } from '../OrganizationValidators';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';

describe('OrganizationValidators', () => {
	test('equals', () => {
		const a = createDummyPublicKey();
		const b = createDummyPublicKey();
		const c = createDummyPublicKey();
		const validators = new OrganizationValidators([a, b, c]);
		const validators2 = new OrganizationValidators([a, b, c]);
		expect(validators.equals(validators2)).toBe(true);
	});

	test('not equals', () => {
		const a = createDummyPublicKey();
		const b = createDummyPublicKey();
		const c = createDummyPublicKey();
		const validators = new OrganizationValidators([a, b, c]);
		const validators2 = new OrganizationValidators([a, b]);
		expect(validators.equals(validators2)).toBe(false);
	});

	test('equals different PublicKey order', () => {
		const a = createDummyPublicKey();
		const b = createDummyPublicKey();
		const c = createDummyPublicKey();
		const validators = new OrganizationValidators([a, b, c]);
		const validators2 = new OrganizationValidators([c, b, a]);
		expect(validators.equals(validators2)).toBe(true);
	});

	test('equals empty array', () => {
		const validators = new OrganizationValidators([]);
		const validators2 = new OrganizationValidators([]);
		expect(validators.equals(validators2)).toBe(true);
	});

	test('not equals empty array', () => {
		const validators = new OrganizationValidators([]);
		const validators2 = new OrganizationValidators([createDummyPublicKey()]);
		expect(validators.equals(validators2)).toBe(false);
	});

	test('contains', () => {
		const a = createDummyPublicKey();
		const b = createDummyPublicKey();
		const c = createDummyPublicKey();
		const validators = new OrganizationValidators([a, b, c]);
		expect(validators.contains(a)).toBe(true);
		expect(validators.contains(b)).toBe(true);
		expect(validators.contains(c)).toBe(true);
	});

	test('not contains', () => {
		const a = createDummyPublicKey();
		const b = createDummyPublicKey();
		const c = createDummyPublicKey();
		const validators = new OrganizationValidators([a, b]);
		expect(validators.contains(c)).toBe(false);
	});
});
