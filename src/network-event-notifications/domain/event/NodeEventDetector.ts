import 'reflect-metadata';
import { Node } from '@stellarbeat/js-stellar-domain';
import { Event, EventData, HistoryArchiveGapDetectedEvent } from './Event';
import { inject, injectable } from 'inversify';
import { PublicKey } from './EventSourceId';
import { EventRepository } from './EventRepository';

@injectable()
export class NodeEventDetector {
	constructor(
		@inject('EventRepository') private eventRepository: EventRepository
	) {}

	async detect(
		time: Date,
		nodes: Node[],
		previousNodes: Node[]
	): Promise<Event<EventData, PublicKey>[]> {
		return [
			...this.detectHistoryGapEvents(time, nodes, previousNodes),
			...(await this.eventRepository.findNodeEventsForXNetworkUpdates(3, time))
		];
	}

	protected detectHistoryGapEvents(
		time: Date,
		nodes: Node[],
		previousNodes: Node[]
	): Event<EventData, PublicKey>[] {
		const nodesWithGaps = nodes
			.filter((node) => node.historyArchiveGap)
			.filter((node) => {
				const previousNode = previousNodes.find(
					(previousNode) => previousNode.publicKey === node.publicKey
				);
				return previousNode?.historyArchiveGap === false;
			});

		const events: Event<EventData, PublicKey>[] = [];
		nodesWithGaps.forEach((node) => {
			const publicKeyResult = PublicKey.create(node.publicKey);
			if (!publicKeyResult.isOk()) return;

			events.push(
				new HistoryArchiveGapDetectedEvent(time, publicKeyResult.value, {})
			);
		});

		return events;
	}
}
