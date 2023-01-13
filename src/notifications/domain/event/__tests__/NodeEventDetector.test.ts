import { Node } from '@stellarbeat/js-stellar-domain';
import {
	HistoryArchiveErrorDetectedEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../Event';
import { NodeEventDetector } from '../NodeEventDetector';
import { EventRepository } from '../EventRepository';
import { mock } from 'jest-mock-extended';
import { PublicKey } from '../EventSourceId';

it('should detect history error events', async function () {
	const nodeA = new Node(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	nodeA.historyArchiveHasError = false;

	const nodeB = new Node(
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	);
	nodeB.historyArchiveHasError = true;

	const nodeC = new Node(
		'GCM6QMP3DLRPTAZW2UZPCPX2LF3SXWXKPMP3GKFZBDSF3QZGV2G5QSTK'
	);
	nodeC.historyArchiveHasError = true;

	const nodeAUpdate = Node.fromJSON(JSON.stringify(nodeA));
	nodeAUpdate.historyArchiveHasError = true;
	const nodeBUpdate = Node.fromJSON(JSON.stringify(nodeB));
	nodeBUpdate.historyArchiveHasError = true;
	const nodeCUpdate = Node.fromJSON(JSON.stringify(nodeC));
	nodeCUpdate.historyArchiveHasError = false;

	const eventRepository = mock<EventRepository>();
	eventRepository.findNodeEventsForXNetworkScans.mockResolvedValue([]);

	const detector = new NodeEventDetector(eventRepository);

	const events = await detector.detect(
		new Date(),
		[nodeAUpdate, nodeBUpdate, nodeCUpdate],
		[nodeA, nodeB, nodeC]
	);

	expect(events).toHaveLength(1);
	expect(events[0].sourceId.value).toEqual(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	expect(events[0]).toBeInstanceOf(HistoryArchiveErrorDetectedEvent);
});

it('should return node events for x network updates', async function () {
	const publicKey = PublicKey.create(
		'GCGB2S2KGYARPVIA37HYZXVRM2YZUEXA6S33ZU5BUDC6THSB62LZSTYH'
	);
	if (publicKey.isErr()) throw publicKey.error;
	const event = new ValidatorXUpdatesNotValidatingEvent(
		new Date(),
		publicKey.value,
		{
			numberOfUpdates: 3
		}
	);
	const eventRepository = mock<EventRepository>();
	eventRepository.findNodeEventsForXNetworkScans.mockResolvedValue([event]);

	const detector = new NodeEventDetector(eventRepository);

	const events = await detector.detect(new Date(), [], []);

	expect(events).toHaveLength(1);
	expect(events[0]).toEqual(event);
});
