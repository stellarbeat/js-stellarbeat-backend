import { err, ok, Result } from 'neverthrow';
import validator from 'validator';

export class Url {
	public value;

	private constructor(url: string) {
		this.value = url;
	}

	static create(url: string): Result<Url, Error> {
		if (!validator.isURL(url))
			return err(new Error('Url is not a proper url: ' + url));

		url = url.replace(/\/$/, ''); //remove trailing slash

		return ok(new Url(url));
	}
}
