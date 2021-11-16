import { Container, decorate, injectable } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { SubscriberRepository } from '../../../domain/subscription/SubscriberRepository';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Unsubscribe } from '../Unsubscribe';
import { ok } from 'neverthrow';
import Mock = jest.Mock;
import { createDummySubscriber } from '../../../domain/subscription/__fixtures__/Subscriber.fixtures';
import { randomUUID } from 'crypto';
import { Connection } from 'typeorm';
import { UserService } from '../../../../shared/services/UserService';

decorate(injectable(), UserService);
jest.mock('../../../../shared/services/UserService');

let container: Container;
const kernel = new Kernel();
let SubscriberRepository: SubscriberRepository;
jest.setTimeout(60000); //slow integration tests
beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	SubscriberRepository = kernel.container.get('SubscriberRepository');
});

afterEach(async () => {
	await container.get(Connection).close();
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
	await SubscriberRepository.save([subscriber]);

	const unsubscribe = container.get(Unsubscribe);
	await unsubscribe.execute({
		subscriberReference: subscriber.subscriberReference.value
	});

	const fetchedSubscriber = await SubscriberRepository.findOneByUserId(
		subscriber.userId
	);
	expect(fetchedSubscriber).toBeNull();
	expect(remoteDeleteFunction).toBeCalledWith(subscriber.userId);
});
