import { isObject, isString } from './TypeGuards';

interface ZLibError {
	errno: number;
	code: string;
	message: string;
}
export function isZLibError(error: unknown): error is ZLibError {
	return (
		isObject(error) &&
		Number.isInteger(error.errno) &&
		isString(error.code) &&
		isString(error.message)
	);
}
