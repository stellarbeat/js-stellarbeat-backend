import NetworkReadRepository from '../../network/repositories/NetworkReadRepository';
import {
	EventSourceId,
	OrganizationId,
	PublicKey
} from '../domain/event/EventSourceId';
import { err, ok, Result } from 'neverthrow';
import { EventSourceService } from '../domain/event/EventSourceService';
import { injectable } from 'inversify';
import { EventSource } from '../domain/event/EventSource';

@injectable()
export class EventSourceFromNetworkService implements EventSourceService {
	constructor(protected networkReadRepository: NetworkReadRepository) {}

	async isEventSourceIdKnown(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<boolean, Error>> {
		const networkResult = await this.networkReadRepository.getNetwork(time);
		if (networkResult.isErr()) {
			return err(networkResult.error);
		}

		const network = networkResult.value;

		if (network === null) return err(new Error('No network found at ' + time));

		if (eventSourceId instanceof PublicKey)
			return ok(!network.getNodeByPublicKey(eventSourceId.value).unknown);

		if (eventSourceId instanceof OrganizationId)
			return ok(!network.getOrganizationById(eventSourceId.value).unknown);

		return ok(eventSourceId.value === network.id);
	}

	async findEventSource(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<EventSource, Error>> {
		const networkResult = await this.networkReadRepository.getNetwork(time);
		if (networkResult.isErr()) {
			return err(networkResult.error);
		}

		const network = networkResult.value;

		if (network === null) return err(new Error('No network found at ' + time));

		if (eventSourceId instanceof PublicKey)
			return ok(
				new EventSource(
					eventSourceId,
					network.getNodeByPublicKey(eventSourceId.value).displayName
				)
			);

		if (eventSourceId instanceof OrganizationId)
			return ok(
				new EventSource(
					eventSourceId,
					network.getOrganizationById(eventSourceId.value).name
				)
			);

		return ok(
			new EventSource(
				eventSourceId,
				network.name ? network.name : 'Stellar Public network'
			)
		);
	}
}
