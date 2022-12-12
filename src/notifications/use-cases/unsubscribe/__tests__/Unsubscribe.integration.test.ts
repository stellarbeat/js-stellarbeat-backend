import { Container, decorate, injectable } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { Unsubscribe } from '../Unsubscribe';
import { err, ok } from 'neverthrow';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { randomUUID } from 'crypto';
import {
	UserNotFoundError,
	UserService
} from '../../../../core/services/UserService';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { OrganizationId } from '../../../domain/event/EventSourceId';
import { OrganizationXUpdatesUnavailableEvent } from '../../../domain/event/Event';
import Mock = jest.Mock;

decorate(injectable(), UserService);
jest.mock('../../../../core/services/UserService');

let container: Container;
let kernel: Kernel;
let SubscriberRepository: SubscriberRepository;
jest.setTimeout(60000); //slow integration tests
beforeEach(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	SubscriberRepository = kernel.container.get('SubscriberRepository');
});

afterEach(async () => {
	await kernel.close();
});

it('should return error if subscriberRef has invalid format', async function () {
	const unsubscribe = container.get(Unsubscribe);
	const result = await unsubscribe.execute({ subscriberReference: 'invalid' });
	expect(result.isErr()).toBeTruthy();
});

it('should return error if subscriber is not found', async function () {
	const unsubscribe = container.get(Unsubscribe);
	const result = await unsubscribe.execute({
		subscriberReference: randomUUID()
	});
	expect(result.isErr()).toBeTruthy();
});

it('should delete subscriber in user service and in local database', async function () {
	const remoteDeleteFunction = jest.fn().mockResolvedValue(ok(undefined));
	(UserService as Mock).mockImplementation(() => {
		return {
			deleteUser: remoteDeleteFunction
		};
	});

	const subscriber = createDummySubscriber();
	const pendingSubscriptionId = createDummyPendingSubscriptionId();
	subscriber.addPendingSubscription(
		pendingSubscriptionId,
		[new OrganizationId('org')],
		new Date()
	);
	subscriber.confirmPendingSubscription(pendingSubscriptionId);
	subscriber.publishNotificationAbout([
		new OrganizationXUpdatesUnavailableEvent(
			new Date(),
			new OrganizationId('org'),
			{
				numberOfUpdates: 3
			}
		)
	]); //test if notification state doesnt cause foreign key error
	await SubscriberRepository.save([subscriber]);

	const unsubscribe = container.get(Unsubscribe);

	const result = await unsubscribe.execute({
		subscriberReference: subscriber.subscriberReference.value
	});
	expect(result.isOk()).toBeTruthy();

	const fetchedSubscriber = await SubscriberRepository.findOneByUserId(
		subscriber.userId
	);
	expect(fetchedSubscriber).toBeNull();
	expect(remoteDeleteFunction).toBeCalledWith(subscriber.userId);
});

it('should delete subscriber, even if user is not found in user service', async function () {
	const subscriber = createDummySubscriber();
	const remoteDeleteFunction = jest
		.fn()
		.mockResolvedValue(err(new UserNotFoundError(subscriber.userId)));
	(UserService as Mock).mockImplementation(() => {
		return {
			deleteUser: remoteDeleteFunction
		};
	});

	await SubscriberRepository.save([subscriber]);

	const unsubscribe = container.get(Unsubscribe);
	const result = await unsubscribe.execute({
		subscriberReference: subscriber.subscriberReference.value
	});
	expect(result.isOk()).toBeTruthy();

	const fetchedSubscriber = await SubscriberRepository.findOneByUserId(
		subscriber.userId
	);
	expect(fetchedSubscriber).toBeNull();
	expect(remoteDeleteFunction).toBeCalledWith(subscriber.userId);
});
