import { Container, decorate, injectable } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Connection, getRepository } from 'typeorm';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network/domain/NetworkUpdate';
import { UnmuteNotificationDTO } from '../UnmuteNotificationDTO';
import { ConsoleMailer } from '../../../../shared/infrastructure/mail/ConsoleMailer';
import { Subscription } from '../../../domain/contact/Subscription';
import { PublicKey } from '../../../domain/event/EventSourceId';
import { Contact } from '../../../domain/contact/Contact';
import { ValidatorXUpdatesNotValidatingEvent } from '../../../domain/event/Event';
import { Mailer } from '../../../../shared/domain/Mailer';
import Mock = jest.Mock;
import { UnmuteNotification } from '../UnmuteNotification';
import { EventNotificationState } from '../../../domain/contact/EventNotificationState';
import exp = require('constants');
decorate(injectable(), ConsoleMailer);
jest.mock('../../../../shared/infrastructure/mail/ConsoleMailer');

let container: Container;
const kernel = new Kernel();
let contactRepository: ContactRepository;
let networkWriteRepository: NetworkWriteRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);
	contactRepository = kernel.container.get('ContactRepository');

	nodeA = new Node('GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH');
	nodeA.active = true;
	nodeA.isValidating = true;
	nodeA.quorumSet.threshold = 2;
	nodeA.quorumSet.validators = [
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK',
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	];
	nodeB = new Node('GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK');
	nodeB.active = true;
	nodeB.isValidating = true;
	nodeB.quorumSet.threshold = 2;
	nodeB.quorumSet.validators = [
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK',
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	];
});

afterEach(async () => {
	await container.get(Connection).close();
});
it('should unmute notification', async function () {
	const updateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([nodeA, nodeB])
	);

	const contact = Contact.create({
		contactId: contactRepository.nextIdentity()
	});
	const publicKeyResult = PublicKey.create(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	expect(publicKeyResult.isOk()).toBeTruthy();
	if (!publicKeyResult.isOk()) return;

	contact.addSubscription(
		Subscription.create({
			eventSourceId: publicKeyResult.value,
			eventNotificationStates: []
		})
	);

	const event = new ValidatorXUpdatesNotValidatingEvent(
		new Date(),
		publicKeyResult.value,
		{
			numberOfUpdates: 3
		}
	);

	const firstNotification = contact.publishNotificationAbout([event]);
	expect(firstNotification?.events).toHaveLength(1);

	const nullNotification = contact.publishNotificationAbout([event]);
	expect(nullNotification).toBeNull();

	await contactRepository.save([contact]);

	const unmuteNotification = container.get(UnmuteNotification);
	const unmuteDTO: UnmuteNotificationDTO = {
		eventSourceType: 'node',
		eventSourceId: event.sourceId.value,
		eventType: event.type,
		contactRef: contact.publicReference.value
	};

	const result = await unmuteNotification.execute(unmuteDTO);
	expect(result.isOk()).toBeTruthy();
	const eventStateRepo = getRepository(EventNotificationState, 'test');
	const state = await eventStateRepo.findOne(1);
	expect(state?.ignoreCoolOffPeriod).toBeTruthy();
});
