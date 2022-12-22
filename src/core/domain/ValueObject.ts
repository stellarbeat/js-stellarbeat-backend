import { shallowEqual } from 'shallow-equal-object';

export abstract class ValueObject {
	equals(other: this): boolean {
		if (other === null || other === undefined) {
			return false;
		}

		return shallowEqual(this, other);
	}
}
