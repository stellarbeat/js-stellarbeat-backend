export function isString(param: unknown): param is string {
	return typeof param === 'string';
}

export function isArray(array: unknown): array is unknown[] {
	return Array.isArray(array);
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object' && obj !== null;
}

export function isNumber(number: unknown): number is number {
	return typeof number === 'number';
}

export default function isPartOfStringEnum<T extends Record<string, unknown>>(
	value: unknown,
	myEnum: T
): value is T[keyof T] {
	return Object.values(myEnum).includes(value);
}

export function instanceOfError(object: unknown): object is Error {
	return isObject(object) && 'name' in object && 'message' in object;
}
