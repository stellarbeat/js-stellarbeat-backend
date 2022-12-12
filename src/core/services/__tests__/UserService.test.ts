import { UserService } from '../UserService';
import { HttpError, HttpService } from '../HttpService';
import { UserId } from '../../../notifications/domain/subscription/UserId';
import { err, ok } from 'neverthrow';
import { randomUUID } from 'crypto';
import { createDummySubscriber } from '../../../notifications/domain/subscription/__fixtures__/Subscriber.fixtures';
import { Message } from '../../domain/Message';
import { mock } from 'jest-mock-extended';

const httpService = mock<HttpService>();

const userService = new UserService(
	'https://user-service.com',
	'user',
	'pass',
	httpService
);
describe('constructor', function () {
	it('should throw error when user resource url is invalid', function () {
		expect(
			() =>
				new UserService('https://user-servicecom', 'user', 'pass', httpService)
		).toThrowError();
		new UserService('https://users.com/', 'user', 'pass', httpService);
		new UserService('https://valid.com', 'user', 'pass', httpService);
	});
});

describe('delete user', () => {
	it('should delete user', async function () {
		httpService.delete.mockReturnValue(
			new Promise((resolve) =>
				resolve(
					ok({
						data: {},
						status: 200,
						statusText: 'ok',
						headers: {}
					})
				)
			)
		);

		const result = await userService.deleteUser(createDummySubscriber().userId);
		expect(result.isOk()).toBeTruthy();
	});

	it('should return error if something goes wrong', async function () {
		httpService.delete.mockReturnValue(
			new Promise((resolve) => resolve(err(new HttpError('error'))))
		);

		const result = await userService.deleteUser(createDummySubscriber().userId);
		expect(result.isOk()).toBeFalsy();
	});
});
describe('send', function () {
	it('should send a message', async function () {
		httpService.post.mockReturnValue(
			new Promise((resolve) =>
				resolve(
					ok({
						data: {},
						status: 200,
						statusText: 'ok',
						headers: {}
					})
				)
			)
		);

		const result = await userService.send(
			createDummySubscriber().userId,
			new Message('body', 'title')
		);
		expect(result.isOk()).toBeTruthy();
	});

	it('should return error when something goes wrong', async function () {
		httpService.post.mockReturnValue(
			new Promise((resolve) => resolve(err(new HttpError('error'))))
		);

		const result = await userService.send(
			createDummySubscriber().userId,
			new Message('body', 'title')
		);
		expect(result.isOk()).toBeFalsy();
	});
});

describe('create or find user', () => {
	it('should create of find user', async function () {
		httpService.post.mockReturnValue(
			new Promise((resolve) =>
				resolve(
					ok({
						data: { userId: randomUUID() },
						status: 200,
						statusText: 'ok',
						headers: {}
					})
				)
			)
		);

		const userIdResult = await userService.findOrCreateUser('home@sb.com');
		if (!userIdResult.isOk()) throw userIdResult.error;
		expect(userIdResult.value).toBeInstanceOf(UserId);
	});

	it('should return valid uuid', async function () {
		httpService.post.mockReturnValue(
			new Promise((resolve) =>
				resolve(
					ok({
						data: { userId: 123 },
						status: 200,
						statusText: 'ok',
						headers: {}
					})
				)
			)
		);

		const userIdResult = await userService.findOrCreateUser('home@sb.com');
		expect(userIdResult.isOk()).toBeFalsy();
	});

	it('should return error when external service returns invalid data', async function () {
		httpService.post.mockReturnValue(
			new Promise((resolve) =>
				resolve(
					ok({
						data: null,
						status: 200,
						statusText: 'ok',
						headers: {}
					})
				)
			)
		);

		const userIdResult = await userService.findOrCreateUser('home@sb.com');
		expect(userIdResult.isOk()).toBeFalsy();
	});

	it('should return error when external service returns error', async function () {
		httpService.post.mockReturnValue(
			new Promise((resolve) => resolve(err(new HttpError('error'))))
		);

		const userIdResult = await userService.findOrCreateUser('home@sb.com');
		expect(userIdResult.isOk()).toBeFalsy();
	});
});
