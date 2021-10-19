import { EventDetectionStrategy } from '../EventDetectionStrategy';
import NetworkService from '../../services/NetworkService';
import { Network } from '@stellarbeat/js-stellar-domain';
import { Event, EventType } from '../Event';
import { ExceptionLogger } from '../../services/ExceptionLogger';
import { inject } from 'inversify';
import { CustomError } from '../../errors/CustomError';

export class NetworkEventDetectionStrategy implements EventDetectionStrategy {
	constructor(
		protected networkService: NetworkService,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {
		this.networkService = networkService;
		this.exceptionLogger = exceptionLogger;
	}

	async detect(network: Network): Promise<Event[]> {
		const previousNetworkResult = await this.networkService.getPreviousNetwork(
			network.time
		);
		if (previousNetworkResult.isErr()) {
			this.exceptionLogger.captureException(
				new CustomError(
					'Network events not detected because invalid previous network',
					'NetworkEventDetectionStrategyError',
					previousNetworkResult.error
				)
			);
			return []; //todo: log
		}

		const previousNetwork = previousNetworkResult.value;
		if (!previousNetwork) {
			//no previous network so notifications should no changes can be detected
			return [];
		}
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
	) {
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
