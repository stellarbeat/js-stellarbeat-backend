import { isDateString } from './isDateString';
import { isString } from './TypeGuards';

export function getDateFromParam(param: unknown): Date {
	let time: Date;
	if (!(param && isDateString(param)) || !isString(param)) {
		time = new Date();
	} else {
		time = new Date(param);
	}

	return time;
}
