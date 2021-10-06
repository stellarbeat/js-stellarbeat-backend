export class CustomError extends Error {
	constructor(message: string, name: string, public cause?: Error) {
		super(message);
		this.cause = cause;
		this.name = name;
	}

	public toString() {
		let string = this.name + ': ' + this.message;
		if (this.cause instanceof CustomError)
			string += ' => ' + this.cause.toString();
		else if (this.cause)
			string += ' => ' + this.cause.name + ': ' + this.cause.message;

		return string;
	}
}
