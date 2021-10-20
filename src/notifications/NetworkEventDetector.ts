import { Network } from '@stellarbeat/js-stellar-domain';
import { ChangeEventData, Event, EventType, SourceType } from './Event';

export class NetworkEventDetector {
	async detect(
		network: Network,
		previousNetwork: Network
	): Promise<Event<Record<string, unknown>>[]> {
		return [
			...(await this.detectTransitiveQuorumSetChangedEvents(
				network,
				previousNetwork
			))
		];
	}

	protected async detectTransitiveQuorumSetChangedEvents(
		network: Network,
		previousNetwork: Network
	): Promise<Event<ChangeEventData>[]> {
		if (
			previousNetwork &&
			this.areTransitiveQuorumSetsEqual(
				previousNetwork.nodesTrustGraph.networkTransitiveQuorumSet,
				network.nodesTrustGraph.networkTransitiveQuorumSet
			)
		)
			return [];

		return [
			new Event<ChangeEventData>(
				network.time,
				EventType.NetworkTransitiveQuorumSetChanged,
				{
					type: SourceType.Network,
					id: network.id ?? 'public'
				},
				{
					from: Array.from(
						previousNetwork.nodesTrustGraph.networkTransitiveQuorumSet
					),
					to: Array.from(network.nodesTrustGraph.networkTransitiveQuorumSet)
				}
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
