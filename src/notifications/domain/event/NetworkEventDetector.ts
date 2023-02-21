import { err, ok, Result } from 'neverthrow';
import 'reflect-metadata';
import { NetworkV1 } from '@stellarbeat/js-stellarbeat-shared';
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
		network: NetworkV1,
		previousNetwork: NetworkV1
	): Result<Event<EventData, NetworkId>[], Error> {
		//todo: network validation should be handled better
		if (
			network.statistics.minSplittingSetSize === undefined ||
			previousNetwork.statistics.minSplittingSetSize === undefined
		)
			return err(
				new Error('minSplittingSetSize undefined, incomplete network analysis')
			);

		if (
			network.statistics.minSplittingSetOrgsSize === undefined ||
			previousNetwork.statistics.minSplittingSetOrgsSize === undefined
		)
			return err(
				new Error(
					'minSplittingSetOrgsSize undefined, incomplete network analysis'
				)
			);
		if (
			network.statistics.minBlockingSetFilteredSize === undefined ||
			previousNetwork.statistics.minBlockingSetFilteredSize === undefined
		)
			return err(
				new Error(
					'minBlockingSetFilteredSize undefined, incomplete network analysis'
				)
			);
		if (
			network.statistics.minBlockingSetOrgsFilteredSize === undefined ||
			previousNetwork.statistics.minBlockingSetOrgsFilteredSize === undefined
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
				new Date(network.time),
				new NetworkId(networkId),
				previousNetwork.statistics.minBlockingSetFilteredSize,
				network.statistics.minBlockingSetFilteredSize,
				previousNetwork.statistics.minBlockingSetOrgsFilteredSize,
				network.statistics.minBlockingSetOrgsFilteredSize
			),
			...this.detectSafetyEvents(
				new Date(network.time),
				new NetworkId(networkId),
				previousNetwork.statistics.minSplittingSetSize,
				network.statistics.minSplittingSetSize,
				previousNetwork.statistics.minSplittingSetOrgsSize,
				network.statistics.minSplittingSetOrgsSize
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
		network: NetworkV1,
		previousNetwork: NetworkV1,
		currentNetworkId: NetworkId
	): Event<ChangeEventData, EventSourceId>[] {
		if (
			previousNetwork &&
			this.areTransitiveQuorumSetsEqual(
				new Set(previousNetwork.transitiveQuorumSet),
				new Set(network.transitiveQuorumSet)
			)
		)
			return [];

		return [
			new NetworkTransitiveQuorumSetChangedEvent(
				new Date(network.time),
				currentNetworkId,
				{
					from: Array.from(previousNetwork.transitiveQuorumSet).map(
						(publicKey) =>
							this.getNodeDisplayNameByPublicKey(publicKey, previousNetwork)
					),
					to: Array.from(network.transitiveQuorumSet).map((publicKey) =>
						this.getNodeDisplayNameByPublicKey(publicKey, network)
					)
				}
			)
		];
	}

	private getNodeDisplayNameByPublicKey(publicKey: string, network: NetworkV1) {
		const node = network.nodes.find((node) => node.publicKey === publicKey);
		if (!node) return publicKey;
		return node.name ?? node.publicKey;
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
