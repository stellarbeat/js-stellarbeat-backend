import { Container } from 'inversify';
import Kernel from '../../../../core/infrastructure/Kernel';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { ConfirmSubscription } from '../ConfirmSubscription';
import { createDummyPendingSubscriptionId } from '../../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { NetworkId } from '../../../domain/event/EventSourceId';
import { NoPendingSubscriptionFound } from '../ConfirmSubscriptionError';

let container: Container;
let kernel: Kernel;
let SubscriberRepository: SubscriberRepository;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	container = kernel.container;
	SubscriberRepository = kernel.container.get('SubscriberRepository');
});

afterAll(async () => {
	await kernel.close();
});

it('should return error if subscriber is not found', async function () {
	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: createDummyPendingSubscriptionId().value
	});
	if (result.isOk()) throw new Error('Must return error');
	expect(result.error).toBeInstanceOf(NoPendingSubscriptionFound);
});

it('should return error if pending subscription id has invalid format', async function () {
	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: 'invalid'
	});
	expect(result.isErr()).toBeTruthy();
});

it('should return error if pending subscription id is not linked to subscriber', async function () {
	const subscriber = createDummySubscriber();
	await SubscriberRepository.save([subscriber]);
	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: createDummyPendingSubscriptionId().value
	});
	expect(result.isErr()).toBeTruthy();
});

it('should create the actual subscriptions when confirmed', async function () {
	const subscriber = createDummySubscriber();
	const subId = createDummyPendingSubscriptionId();
	subscriber.addPendingSubscription(
		subId,
		[new NetworkId('public')],
		new Date()
	);
	await SubscriberRepository.save([subscriber]);

	const confirm = container.get(ConfirmSubscription);
	const result = await confirm.execute({
		pendingSubscriptionId: subId.value
	});

	expect(result.isOk()).toBeTruthy();
});
