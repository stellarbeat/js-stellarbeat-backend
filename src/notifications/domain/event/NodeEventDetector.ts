import 'reflect-metadata';
import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';
import { Event, EventData, HistoryArchiveErrorDetectedEvent } from './Event';
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
		nodes: NodeV1[],
		previousNodes: NodeV1[]
	): Promise<Event<EventData, PublicKey>[]> {
		return [
			...this.detectHistoryErrorEvents(time, nodes, previousNodes),
			...(await this.eventRepository.findNodeEventsForXNetworkScans(3, time))
		];
	}

	protected detectHistoryErrorEvents(
		time: Date,
		nodes: NodeV1[],
		previousNodes: NodeV1[]
	): Event<EventData, PublicKey>[] {
		const nodesWithErrors = nodes
			.filter((node) => node.historyArchiveHasError)
			.filter((node) => {
				const previousNode = previousNodes.find(
					(previousNode) => previousNode.publicKey === node.publicKey
				);
				return previousNode?.historyArchiveHasError === false;
			});

		const events: Event<EventData, PublicKey>[] = [];
		nodesWithErrors.forEach((node) => {
			const publicKeyResult = PublicKey.create(node.publicKey);
			if (!publicKeyResult.isOk()) return;

			events.push(
				new HistoryArchiveErrorDetectedEvent(time, publicKeyResult.value, {})
			);
		});

		return events;
	}
}
