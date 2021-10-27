export class CustomError extends Error {
	public errorType = 'CustomError'; //to allow type inference in err() result

	constructor(message: string, name: string, public cause?: Error) {
		super(message);
		this.cause = cause;
		this.name = name;
	}

	get message(): string {
		return this.toString();
	}

	public toString(): string {
		let string = this.name + ': ' + this.message;
		if (this.cause instanceof CustomError)
			string += ' => ' + this.cause.toString();
		else if (this.cause)
			string += ' => ' + this.cause.name + ': ' + this.cause.message;

		return string;
	}
}
