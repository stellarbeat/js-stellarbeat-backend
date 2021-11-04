export class CustomError extends Error {
	public errorType = 'CustomError'; //to allow type inference in err() result

	constructor(message: string, name: string, public cause?: Error) {
		super(message);
		this.message = CustomError.getExtendedMessage(name, message, cause);
		this.cause = cause;
		this.name = name;
	}

	private static getExtendedMessage(
		name: string,
		message: string,
		cause?: Error
	) {
		let extendedMessage = name + ': ' + message;
		if (cause instanceof CustomError) extendedMessage += ' => ' + cause.message;
		else if (cause)
			extendedMessage += ' => ' + cause.name + ': ' + cause.message;
		return extendedMessage;
	}
}
