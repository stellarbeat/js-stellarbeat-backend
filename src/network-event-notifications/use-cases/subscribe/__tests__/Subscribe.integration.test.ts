import { Container } from 'inversify';
import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { Connection } from 'typeorm';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { ContactRepository } from '../../../domain/contact/ContactRepository';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network/domain/NetworkUpdate';
import { EventSourceIdDTO, SubscribeDTO } from '../SubscribeDTO';
import { Subscribe } from '../Subscribe';
import { EventSourceIdFactory } from '../../../domain/event/EventSourceIdFactory';
import { Mailer } from '../../../../shared/domain/Mailer';
import { ok } from 'neverthrow';
import { Contact } from '../../../domain/contact/Contact';
import { PendingSubscription } from '../../../domain/contact/PendingSubscription';

let container: Container;
const kernel = new Kernel();
let subscribe: Subscribe;
let networkWriteRepository: NetworkWriteRepository;
jest.setTimeout(60000); //slow integration tests

let nodeA: Node;
let nodeB: Node;

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	networkWriteRepository = kernel.container.get(NetworkWriteRepository);

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

it('should create new contact and create a pending subscription for a known node', async function () {
	const updateTime = new Date();
	await networkWriteRepository.save(
		new NetworkUpdate(updateTime),
		new Network([nodeA, nodeB])
	);

	const eventSourceIdDTO: EventSourceIdDTO = {
		type: 'node',
		id: 'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	};
	const subscribeDTO = new SubscribeDTO(
		'home@sb.com',
		[eventSourceIdDTO],
		updateTime
	);

	const mailer = container.get<Mailer>('Mailer');
	const contactRepository =
		container.get<ContactRepository>('ContactRepository');
	const createContactFunction = jest.spyOn(mailer, 'findOrCreateContact');
	const contactId = contactRepository.nextIdentity();
	createContactFunction.mockResolvedValue(ok(contactId));
	subscribe = new Subscribe(
		container.get(EventSourceIdFactory),
		contactRepository,
		mailer
	);
	const result = await subscribe.execute(subscribeDTO);
	expect(result.isOk()).toBeTruthy();
	if (result.isErr()) {
		console.log(result.error);
		return;
	}
	expect(result.value.failed).toHaveLength(0);
	expect(result.value.subscribed).toEqual([eventSourceIdDTO]);
	expect(createContactFunction).toBeCalledTimes(1);

	const contact = await contactRepository.findOneByContactId(contactId);
	expect(contact).toBeInstanceOf(Contact);
	expect(contact?.pendingSubscription).toBeInstanceOf(PendingSubscription);
	expect(contact?.pendingSubscription?.eventSourceIds).toHaveLength(1);
	expect(contact?.pendingSubscription?.eventSourceIds[0].value).toEqual(
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	);
});
