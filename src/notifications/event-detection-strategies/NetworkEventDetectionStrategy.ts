import { EventDetectionStrategy } from '../EventDetectionStrategy';
import NetworkService from '../../services/NetworkService';
import { Network } from '@stellarbeat/js-stellar-domain';
import { Event, EventType } from '../Event';

export class NetworkEventDetectionStrategy implements EventDetectionStrategy {
	constructor(protected networkService: NetworkService) {
		this.networkService = networkService;
	}

	async detect(network: Network): Promise<Event[]> {
		return [...(await this.detectTransitiveQuorumSetChangedEvents(network))];
	}

	protected async detectTransitiveQuorumSetChangedEvents(network: Network) {
		const previousNetwork = await this.networkService.getPreviousNetwork(
			network.time
		);

		if (
			previousNetwork &&
			this.areTransitiveQuorumSetsEqual(
				previousNetwork.nodesTrustGraph.networkTransitiveQuorumSet,
				network.nodesTrustGraph.networkTransitiveQuorumSet
			)
		)
			return [];

		return [
			new Event(
				network.time,
				EventType.NetworkTransitiveQuorumSetChanged,
				network.name ?? 'public'
			)
		];
	}

	protected areTransitiveQuorumSetsEqual(
		transitiveQSet: Set<string>,
		otherTransQSet: Set<string>
	) {
		if (transitiveQSet.size !== otherTransQSet.size) return false;

		let equal = true;
		transitiveQSet.forEach((publicKey) => {
			if (!otherTransQSet.has(publicKey)) equal = false;
		});

		return equal;
	}
}
