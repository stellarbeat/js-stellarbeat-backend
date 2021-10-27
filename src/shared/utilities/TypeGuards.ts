export function isString(param: unknown): param is string {
	return typeof param === 'string';
}

export function isArray(array: unknown): array is unknown[] {
	return Array.isArray(array);
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === 'object';
}

export function isNumber(number: unknown): number is number {
	return typeof number === 'number';
}
