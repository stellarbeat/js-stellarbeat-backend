import { RequestUnsubscribeLink } from '../RequestUnsubscribeLink';
import { mock } from 'jest-mock-extended';
import { MessageCreator } from '../../../domain/notifier/MessageCreator';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { IUserService } from '../../../../core/domain/IUserService';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import { err, ok } from 'neverthrow';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { Message } from '../../../../core/domain/Message';

describe('RequestUnsubscribeLink', () => {
	function setupSUT() {
		const messageCreator = mock<MessageCreator>();
		const subscriberRepository = mock<SubscriberRepository>();
		const userService = mock<IUserService>();
		const exceptionLogger = mock<ExceptionLogger>();
		const logger = mock<Logger>();

		const requestUnsubscribeLink = new RequestUnsubscribeLink(
			messageCreator,
			subscriberRepository,
			userService,
			exceptionLogger,
			logger
		);

		//setup mocks
		const subscriber = createDummySubscriber();
		userService.findUser.mockResolvedValue(ok(subscriber.userId));
		subscriberRepository.findOneByUserId.mockResolvedValue(subscriber);
		userService.send.mockResolvedValue(ok(undefined));
		const message: Message = {
			body: 'test',
			title: 'test'
		};
		const time = new Date();
		const emailAddress = 'test@localhost.com';

		messageCreator.createUnsubscribeMessage.mockResolvedValue(message);
		return {
			messageCreator,
			subscriberRepository,
			userService,
			requestUnsubscribeLink,
			subscriber,
			message,
			time,
			emailAddress
		};
	}

	it('should send unsubscribe message when user is subscribed', async () => {
		const {
			messageCreator,
			subscriberRepository,
			userService,
			requestUnsubscribeLink,
			subscriber,
			message,
			time,
			emailAddress
		} = setupSUT();

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isOk()).toBeTruthy();
		expect(userService.send).toBeCalledTimes(1);
		expect(userService.findUser).toBeCalledTimes(1);
		expect(userService.findUser).toBeCalledWith(emailAddress);
		expect(subscriberRepository.findOneByUserId).toBeCalledTimes(1);
		expect(subscriberRepository.findOneByUserId).toBeCalledWith(
			subscriber.userId
		);
		expect(messageCreator.createUnsubscribeMessage).toBeCalledTimes(1);
		expect(messageCreator.createUnsubscribeMessage).toBeCalledWith(
			subscriber.subscriberReference,
			time
		);
		expect(userService.send).toBeCalledTimes(1);
		expect(userService.send).toBeCalledWith(subscriber.userId, message);
	});

	it('should not send unsubscribe message when user is not subscribed', async () => {
		const {
			subscriberRepository,
			userService,
			requestUnsubscribeLink,
			time,
			emailAddress
		} = setupSUT();

		subscriberRepository.findOneByUserId.mockResolvedValue(null);

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isOk()).toBeTruthy();
		expect(userService.send).toBeCalledTimes(0);
	});

	it('should not send unsubscribe message when user is not found', async () => {
		const { userService, requestUnsubscribeLink, time, emailAddress } =
			setupSUT();

		userService.findUser.mockResolvedValue(ok(null));

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isOk()).toBeTruthy();
		expect(userService.send).toBeCalledTimes(0);
	});

	it('should return error when user service returns error', async () => {
		const { userService, requestUnsubscribeLink, time, emailAddress } =
			setupSUT();

		userService.findUser.mockResolvedValue(err(new Error('test')));

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isErr()).toBeTruthy();
		expect(userService.send).toBeCalledTimes(0);
	});

	it('should return error when subscriber repository throws error', async () => {
		const {
			subscriberRepository,
			userService,
			requestUnsubscribeLink,
			time,
			emailAddress
		} = setupSUT();

		subscriberRepository.findOneByUserId.mockRejectedValue(new Error('test'));

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isErr()).toBeTruthy();
		expect(subscriberRepository.findOneByUserId).toBeCalledTimes(1);
		expect(userService.send).toBeCalledTimes(0);
	});

	it('should return error when message creator throws error', async () => {
		const {
			messageCreator,
			subscriberRepository,
			userService,
			requestUnsubscribeLink,
			subscriber,
			time,
			emailAddress
		} = setupSUT();

		messageCreator.createUnsubscribeMessage.mockRejectedValue(
			new Error('test')
		);

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isErr()).toBeTruthy();
		expect(subscriberRepository.findOneByUserId).toBeCalledTimes(1);
		expect(userService.send).toBeCalledTimes(0);
	});

	it('should return error when user service send returns error', async () => {
		const {
			messageCreator,
			subscriberRepository,
			userService,
			requestUnsubscribeLink,
			subscriber,
			time,
			emailAddress
		} = setupSUT();

		userService.send.mockResolvedValue(err(new Error('test')));

		const result = await requestUnsubscribeLink.execute({
			emailAddress: emailAddress,
			time: time
		});

		expect(result.isErr()).toBeTruthy();
		expect(userService.send).toBeCalledTimes(1);
	});
});
