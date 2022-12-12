import { CustomError } from '../CustomError';

it('should set the name and cause correctly', function () {
	const cause = new Error('The cause');
	const customError = new CustomError('Error', 'custom', cause);
	expect(customError.name).toEqual('custom');
	expect(customError.message).toEqual('custom: Error => Error: The cause');
	expect(customError.cause).toEqual(cause);
});

it('should set custom name', function () {
	const customError = new CustomError('Error', 'CustomError');
	expect(customError.name).toEqual('CustomError');
});

it('should return message with cause info', function () {
	const cause1 = new Error('First');
	const cause2 = new CustomError('Second', 'SecondError', cause1);
	const error = new CustomError('Third', 'ThirdError', cause2);

	expect(error.message).toEqual(
		'ThirdError: Third => SecondError: Second => Error: First'
	);
});
