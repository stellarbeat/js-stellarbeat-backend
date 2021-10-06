import { CustomError } from '../../src/errors/CustomError';

it('should set the name and cause correctly', function () {
	const cause = new Error('The cause');
	const customError = new CustomError('Error', 'custom', cause);
	expect(customError.name).toEqual('custom');
	expect(customError.message).toEqual('Error');
	expect(customError.cause).toEqual(cause);
});

it('should set custom name', function () {
	const customError = new CustomError('Error', 'CustomError');
	expect(customError.name).toEqual('CustomError');
});

it('should toString correctly', function () {
	const cause1 = new Error('First');
	const cause2 = new CustomError('Second', 'SecondError', cause1);
	const error = new CustomError('Third', 'ThirdError', cause2);

	expect(error.toString()).toEqual(
		'ThirdError: Third => SecondError: Second => Error: First'
	);
});
