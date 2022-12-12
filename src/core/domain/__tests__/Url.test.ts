import { Url } from '../Url';

it('should create a valid url object', function () {
	const urlString = 'https://my-url.com/455';
	const urlResult = Url.create(urlString);

	expect(urlResult.isOk()).toBeTruthy();
});
it('should return an error', function () {
	const urlResult = Url.create(' https://url-with-space-in-front.com');
	expect(urlResult.isErr()).toBeTruthy();
});
