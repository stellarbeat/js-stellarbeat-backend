export class HorizonError extends Error {
	constructor(message?: string) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
		this.name = HorizonError.name; // stack traces display correctly now
	}
}
