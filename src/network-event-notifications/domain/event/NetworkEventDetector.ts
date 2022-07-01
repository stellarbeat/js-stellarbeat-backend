import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import { Network } from '@stellarbeat/js-stellar-domain';
import {
	ChangeEventData,
	Event,
	EventData,
	NetworkLossOfLivenessEvent,
	NetworkLossOfSafetyEvent,
	NetworkNodeLivenessRiskEvent,
	NetworkNodeSafetyRiskEvent,
	NetworkOrganizationLivenessRiskEvent,
	NetworkOrganizationSafetyRiskEvent,
	NetworkTransitiveQuorumSetChangedEvent
} from './Event';
import { injectable } from 'inversify';
import { EventSourceId, NetworkId } from './EventSourceId';

@injectable()
export class NetworkEventDetector {
	static NodeLivenessRiskThreshold = 3;
	static OrganizationLivenessRiskThreshold = 1;
	static NodeSafetyRiskThreshold = 1;
	static OrganizationSafetyRiskThreshold = 1;

	detect(
		network: Network,
		previousNetwork: Network
	): Result<Event<EventData, NetworkId>[], Error> {
		//todo: network validation should be handled better
		if (
			network.networkStatistics.minSplittingSetSize === undefined ||
			previousNetwork.networkStatistics.minSplittingSetSize === undefined
		)
			return err(
				new Error('minSplittingSetSize undefined, incomplete network analysis')
			);

		if (
			network.networkStatistics.minSplittingSetOrgsSize === undefined ||
			previousNetwork.networkStatistics.minSplittingSetOrgsSize === undefined
		)
			return err(
				new Error(
					'minSplittingSetOrgsSize undefined, incomplete network analysis'
				)
			);
		if (
			network.networkStatistics.minBlockingSetFilteredSize === undefined ||
			previousNetwork.networkStatistics.minBlockingSetFilteredSize === undefined
		)
			return err(
				new Error(
					'minBlockingSetFilteredSize undefined, incomplete network analysis'
				)
			);
		if (
			network.networkStatistics.minBlockingSetOrgsFilteredSize === undefined ||
			previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize ===
				undefined
		)
			return err(
				new Error(
					'minBlockingSetOrgsFilteredSize undefined, incomplete network analysis'
				)
			);
		const networkId = network.id;
		if (!networkId) return err(new Error('Network id must be specified'));

		return ok([
			...this.detectLivenessEvents(
				network.time,
				new NetworkId(networkId),
				previousNetwork.networkStatistics.minBlockingSetFilteredSize,
				network.networkStatistics.minBlockingSetFilteredSize,
				previousNetwork.networkStatistics.minBlockingSetOrgsFilteredSize,
				network.networkStatistics.minBlockingSetOrgsFilteredSize
			),
			...this.detectSafetyEvents(
				network.time,
				new NetworkId(networkId),
				previousNetwork.networkStatistics.minSplittingSetSize,
				network.networkStatistics.minSplittingSetSize,
				previousNetwork.networkStatistics.minSplittingSetOrgsSize,
				network.networkStatistics.minSplittingSetOrgsSize
			),
			...this.detectTransitiveQuorumSetChangedEvents(
				network,
				previousNetwork,
				new NetworkId(networkId)
			)
		]);
	}

	protected detectLivenessEvents(
		time: Date,
		id: NetworkId,
		previousMinBlockingSetFilteredSize: number,
		minBlockingSetFilteredSize: number,
		previousMinBlockingSetOrgsFilteredSize: number,
		minBlockingSetOrgsFilteredSize: number
	): Event<EventData, EventSourceId>[] {
		if (
			(previousMinBlockingSetFilteredSize as number) > 0 &&
			(minBlockingSetFilteredSize as number) === 0
		)
			return [
				new NetworkLossOfLivenessEvent(time, id, {
					from: previousMinBlockingSetFilteredSize,
					to: minBlockingSetFilteredSize
				})
			];

		const events: Event<EventData, EventSourceId>[] = [];
		if (
			(minBlockingSetFilteredSize as number) <=
				NetworkEventDetector.NodeLivenessRiskThreshold &&
			(previousMinBlockingSetFilteredSize as number) >
				NetworkEventDetector.NodeLivenessRiskThreshold
		)
			events.push(
				new NetworkNodeLivenessRiskEvent(time, id, {
					from: previousMinBlockingSetFilteredSize,
					to: minBlockingSetFilteredSize
				})
			);

		if (
			(minBlockingSetOrgsFilteredSize as number) <=
				NetworkEventDetector.OrganizationLivenessRiskThreshold &&
			(previousMinBlockingSetOrgsFilteredSize as number) >
				NetworkEventDetector.OrganizationLivenessRiskThreshold
		)
			events.push(
				new NetworkOrganizationLivenessRiskEvent(time, id, {
					from: previousMinBlockingSetOrgsFilteredSize,
					to: minBlockingSetOrgsFilteredSize
				})
			);

		return events;
	}
	protected detectSafetyEvents(
		time: Date,
		id: NetworkId,
		previousMinSplittingSetSize: number,
		minSplittingSetSize: number,
		previousMinSplittingSetOrgSize: number,
		minSplittingSetOrgSize: number
	): Event<EventData, EventSourceId>[] {
		if (
			(previousMinSplittingSetSize as number) > 0 &&
			(minSplittingSetSize as number) === 0
		)
			return [
				new NetworkLossOfSafetyEvent(time, id, {
					from: previousMinSplittingSetSize,
					to: minSplittingSetSize
				})
			];

		const events: Event<EventData, EventSourceId>[] = [];
		if (
			(minSplittingSetSize as number) <=
				NetworkEventDetector.NodeSafetyRiskThreshold &&
			(previousMinSplittingSetSize as number) >
				NetworkEventDetector.NodeSafetyRiskThreshold
		)
			events.push(
				new NetworkNodeSafetyRiskEvent(time, id, {
					from: previousMinSplittingSetSize,
					to: minSplittingSetSize
				})
			);

		if (
			(minSplittingSetOrgSize as number) <=
				NetworkEventDetector.OrganizationSafetyRiskThreshold &&
			(previousMinSplittingSetOrgSize as number) >
				NetworkEventDetector.OrganizationSafetyRiskThreshold
		)
			events.push(
				new NetworkOrganizationSafetyRiskEvent(time, id, {
					from: previousMinSplittingSetOrgSize,
					to: minSplittingSetOrgSize
				})
			);

		return events;
	}
	protected detectTransitiveQuorumSetChangedEvents(
		network: Network,
		previousNetwork: Network,
		currentNetworkId: NetworkId
	): Event<ChangeEventData, EventSourceId>[] {
		if (
			previousNetwork &&
			this.areTransitiveQuorumSetsEqual(
				previousNetwork.nodesTrustGraph.networkTransitiveQuorumSet,
				network.nodesTrustGraph.networkTransitiveQuorumSet
			)
		)
			return [];

		return [
			new NetworkTransitiveQuorumSetChangedEvent(
				network.time,
				currentNetworkId,
				{
					from: Array.from(
						previousNetwork.nodesTrustGraph.networkTransitiveQuorumSet
					).map(
						(publicKey) =>
							previousNetwork.getNodeByPublicKey(publicKey).displayName
					),
					to: Array.from(
						network.nodesTrustGraph.networkTransitiveQuorumSet
					).map(
						(publicKey) => network.getNodeByPublicKey(publicKey).displayName
					)
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
