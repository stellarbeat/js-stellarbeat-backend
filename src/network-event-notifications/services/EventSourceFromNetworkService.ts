import NetworkReadRepository from '../../network/repositories/NetworkReadRepository';
import {
	EventSourceId,
	OrganizationId,
	PublicKey
} from '../domain/event/EventSourceId';
import { err, ok, Result } from 'neverthrow';
import { EventSourceService } from '../domain/event/EventSourceService';
import { injectable } from 'inversify';

@injectable()
export class EventSourceFromNetworkService implements EventSourceService {
	constructor(
		protected networkId: string,
		protected networkReadRepository: NetworkReadRepository
	) {}

	async isEventSourceIdKnown(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<boolean, Error>> {
		const networkResult = await this.networkReadRepository.getNetwork(time);
		if (networkResult.isErr()) {
			return err(networkResult.error);
		}

		const network = networkResult.value;

		if (network === null) return ok(false);

		if (eventSourceId instanceof PublicKey)
			return ok(!network.getNodeByPublicKey(eventSourceId.value).unknown);

		if (eventSourceId instanceof OrganizationId)
			return ok(!network.getOrganizationById(eventSourceId.value).unknown);

		return ok(eventSourceId.value === this.networkId);
	}
}
