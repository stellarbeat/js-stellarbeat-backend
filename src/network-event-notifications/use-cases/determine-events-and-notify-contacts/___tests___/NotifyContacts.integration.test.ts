import { Container } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Connection, getRepository } from 'typeorm';
import { NotifyContacts } from '../NotifyContacts';
import { NotifyContactsDTO } from '../NotifyContactsDTO';
import { NoNetworkError, NoPreviousNetworkError } from '../NotifyContactsError';
import NetworkReadRepository from '../../../../network/repositories/NetworkReadRepository';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { EventDetector } from '../../../domain/event/EventDetector';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { EmailNotifier } from '../../../domain/notifier/EmailNotifier';
import { Logger } from '../../../../shared/services/PinoLogger';
import { ExceptionLogger } from '../../../../shared/services/ExceptionLogger';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network/domain/NetworkUpdate';
import { NullMailer } from '../../../../shared/infrastructure/mail/NullMailer';
import { NetworkId } from '../../../domain/event/EventSourceId';
import { EventNotificationState } from '../../../domain/contact/EventNotificationState';
import { EventType } from '../../../domain/event/Event';
import { createContactDummy } from '../../../domain/contact/__fixtures__/Contact.fixtures';
import { createDummyPendingSubscriptionId } from '../../../domain/contact/__fixtures__/PendingSubscriptionId.fixtures';

let container: Container;
const kernel = new Kernel();
let notifyContacts: NotifyContacts;
let networkReadRepository: NetworkReadRepository;
let eventDetector: EventDetector;
let contactRepository: ContactRepository;
let emailNotifier: EmailNotifier;
let networkWriteRepository: NetworkWriteRepository;
let logger: Logger;
let exceptionLogger: ExceptionLogger;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	networkReadRepository = container.get(NetworkReadRepository);
	eventDetector = container.get(EventDetector);
	contactRepository = container.get<ContactRepository>('ContactRepository');
	emailNotifier = container.get(EmailNotifier);
	logger = container.get<Logger>('Logger');
	exceptionLogger = container.get<ExceptionLogger>('ExceptionLogger');
	notifyContacts = container.get(NotifyContacts);
	nodeA = new Node('A');
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 2;
	nodeA.quorumSet.validators = ['A', 'B'];
	nodeB = new Node('B');
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators = ['A', 'B'];
});

afterEach(async () => {
	await container.get(Connection).close();
});

it('should return error if no network is available', async function () {
	const notifyContactsDTO = new NotifyContactsDTO(new Date());
	const result = await notifyContacts.execute(notifyContactsDTO);
	expect(result.isErr()).toBeTruthy();
	if (!result.isErr()) return;
	expect(result.error).toBeInstanceOf(NoNetworkError);
});

it('should return error if no previous network is available', async function () {
	const updateTime = new Date();

	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([nodeA, nodeB])
	);

	const notifyContactsDTO = new NotifyContactsDTO(updateTime);
	const result = await notifyContacts.execute(notifyContactsDTO);
	expect(result.isErr()).toBeTruthy();
	if (!result.isErr()) return;
	expect(result.error).toBeInstanceOf(NoPreviousNetworkError);
});

it('should notify when a subscribed event occurs', async function () {
	await networkWriteRepository.save(
		new NetworkUpdate(new Date()),
		new Network([nodeA, nodeB])
	);
	nodeA.isValidating = false;
	nodeB.isValidating = false;

	const latestUpdateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(latestUpdateTime),
		new Network([nodeA, nodeB])
	);

	const contact = createContactDummy();
	const pendingId = createDummyPendingSubscriptionId();
	contact.addPendingSubscription(
		pendingId,
		[new NetworkId('public')],
		new Date()
	);
	contact.confirmPendingSubscription(pendingId);
	await contactRepository.save([contact]);

	const notifyContactsDTO = new NotifyContactsDTO(latestUpdateTime);

	const mailer = new NullMailer();
	const mailSpy = jest.spyOn(mailer, 'send');
	notifyContacts = new NotifyContacts(
		networkReadRepository,
		eventDetector,
		contactRepository,
		new EmailNotifier(mailer),
		logger,
		exceptionLogger
	);
	const result = await notifyContacts.execute(notifyContactsDTO);
	expect(result.isOk()).toBeTruthy();
	expect(mailSpy).toBeCalled();

	const eventStateRepo = getRepository(EventNotificationState, 'test');
	const state = await eventStateRepo.findOne(1);
	expect(state?.eventType).toEqual(EventType.NetworkLossOfLiveness);
});
