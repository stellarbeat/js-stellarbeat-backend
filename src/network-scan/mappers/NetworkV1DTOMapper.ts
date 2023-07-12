import {
	NetworkV1,
	NodeV1,
	OrganizationV1
} from '@stellarbeat/js-stellarbeat-shared';
import NetworkMeasurement from '../domain/network/NetworkMeasurement';
import { Network } from '../domain/network/Network';
import { BaseQuorumSetDTOMapper } from './BaseQuorumSetDTOMapper';

export class NetworkV1DTOMapper {
	static toNetworkV1DTO(
		networkName: string,
		networkId: string,
		nodeV1DTOs: NodeV1[],
		organizationV1DTOs: OrganizationV1[],
		networkMeasurement: NetworkMeasurement,
		networkTransitiveQuorumSet: Set<string>,
		stronglyConnectedComponents: Set<string>[],
		latestLedger: number | null,
		networkPassphrase: string,
		network: Network | null
	): NetworkV1 {
		return {
			id: networkId,
			name: networkName,
			passPhrase: networkPassphrase,
			maxLedgerVersion: network?.maxLedgerVersion,
			overlayVersion: network?.overlayVersionRange.max,
			overlayMinVersion: network?.overlayVersionRange.min,
			stellarCoreVersion: network?.stellarCoreVersion.value,
			quorumSetConfiguration: network
				? BaseQuorumSetDTOMapper.fromNetworkQuorumSetConfiguration(
						network.quorumSetConfiguration
				  )
				: undefined,
			nodes: nodeV1DTOs,
			organizations: organizationV1DTOs,
			time: networkMeasurement.time.toISOString(),
			latestLedger: latestLedger?.toString() ?? '0',
			statistics: {
				time: networkMeasurement.time.toISOString(),
				nrOfActiveWatchers: networkMeasurement.nrOfActiveWatchers,
				nrOfActiveValidators: networkMeasurement.nrOfActiveValidators,
				nrOfActiveFullValidators: networkMeasurement.nrOfActiveFullValidators,
				nrOfActiveOrganizations: networkMeasurement.nrOfActiveOrganizations,
				transitiveQuorumSetSize: networkMeasurement.transitiveQuorumSetSize,
				hasTransitiveQuorumSet: networkMeasurement.hasTransitiveQuorumSet,
				hasQuorumIntersection: networkMeasurement.hasQuorumIntersection,
				minBlockingSetSize: networkMeasurement.minBlockingSetSize,
				minBlockingSetFilteredSize:
					networkMeasurement.minBlockingSetFilteredSize,
				minBlockingSetOrgsSize: networkMeasurement.minBlockingSetOrgsSize,
				minBlockingSetOrgsFilteredSize:
					networkMeasurement.minBlockingSetOrgsFilteredSize,
				minBlockingSetCountrySize: networkMeasurement.minBlockingSetCountrySize,
				minBlockingSetCountryFilteredSize:
					networkMeasurement.minBlockingSetCountryFilteredSize,
				minBlockingSetISPSize: networkMeasurement.minBlockingSetISPSize,
				minBlockingSetISPFilteredSize:
					networkMeasurement.minBlockingSetISPFilteredSize,
				minSplittingSetSize: networkMeasurement.minSplittingSetSize,
				minSplittingSetOrgsSize: networkMeasurement.minSplittingSetOrgsSize,
				minSplittingSetCountrySize:
					networkMeasurement.minSplittingSetCountrySize,
				minSplittingSetISPSize: networkMeasurement.minSplittingSetISPSize,
				topTierSize: networkMeasurement.topTierSize,
				topTierOrgsSize: networkMeasurement.topTierOrgsSize,
				hasSymmetricTopTier: networkMeasurement.hasSymmetricTopTier
			},
			transitiveQuorumSet: Array.from(networkTransitiveQuorumSet),
			scc: stronglyConnectedComponents
				.filter((scp) => scp.size > 1)
				.map((scp) => Array.from(scp))
		};
	}
}
