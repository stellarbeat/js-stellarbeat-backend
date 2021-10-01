export class FbasError extends Error {
	constructor(message?: string) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
		this.name = FbasError.name; // stack traces display correctly now
	}
}
