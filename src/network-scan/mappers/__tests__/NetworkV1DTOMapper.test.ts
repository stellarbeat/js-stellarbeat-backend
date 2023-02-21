import { mock } from 'jest-mock-extended';
import { NodeV1, OrganizationV1 } from '@stellarbeat/js-stellarbeat-shared';
import NetworkMeasurement from '../../domain/network/NetworkMeasurement';
import { NetworkV1DTOMapper } from '../NetworkV1DTOMapper';

describe('NetworkV1DTOMapper', () => {
	test('toNetworkV1DTO', () => {
		const networkName = 'Test Network';
		const networkId = 'Test Network ID';
		const nodeV1DTOs = [mock<NodeV1>()];
		const organizationV1DTOs = [mock<OrganizationV1>()];
		const networkMeasurement = new NetworkMeasurement(new Date());
		networkMeasurement.nrOfActiveWatchers = 1;
		networkMeasurement.nrOfActiveValidators = 2;
		networkMeasurement.nrOfActiveFullValidators = 3;
		networkMeasurement.nrOfActiveOrganizations = 4;
		networkMeasurement.transitiveQuorumSetSize = 5;
		networkMeasurement.hasTransitiveQuorumSet = true;
		networkMeasurement.hasQuorumIntersection = true;
		networkMeasurement.minBlockingSetSize = 6;
		networkMeasurement.minBlockingSetFilteredSize = 7;
		networkMeasurement.minBlockingSetOrgsSize = 8;
		networkMeasurement.minBlockingSetOrgsFilteredSize = 9;
		networkMeasurement.minBlockingSetCountrySize = 10;
		networkMeasurement.minBlockingSetCountryFilteredSize = 11;
		networkMeasurement.minBlockingSetISPSize = 12;
		networkMeasurement.minBlockingSetISPFilteredSize = 13;
		networkMeasurement.minSplittingSetSize = 14;
		networkMeasurement.minSplittingSetOrgsSize = 15;
		networkMeasurement.minSplittingSetCountrySize = 16;
		networkMeasurement.minSplittingSetISPSize = 17;
		networkMeasurement.topTierSize = 18;
		networkMeasurement.topTierOrgsSize = 19;
		networkMeasurement.hasSymmetricTopTier = true;

		const networkTransitiveQuorumSet = new Set<string>(['a', 'b', 'c']);
		const stronglyConnectedComponents = [new Set(['a', 'b', 'c'])];
		const latestLedger = 20;

		const networkV1DTO = NetworkV1DTOMapper.toNetworkV1DTO(
			networkName,
			networkId,
			nodeV1DTOs,
			organizationV1DTOs,
			networkMeasurement,
			networkTransitiveQuorumSet,
			stronglyConnectedComponents,
			latestLedger
		);

		expect(networkV1DTO).toEqual({
			id: networkId,
			name: networkName,
			nodes: nodeV1DTOs,
			organizations: organizationV1DTOs,
			latestLedger: latestLedger.toString(),
			scc: Array.from(stronglyConnectedComponents).map(
				(stronglyConnectedComponent) => Array.from(stronglyConnectedComponent)
			),
			statistics: {
				time: networkMeasurement.time.toISOString(),
				nrOfActiveWatchers: networkMeasurement.nrOfActiveWatchers,
				nrOfActiveValidators: networkMeasurement.nrOfActiveValidators,
				nrOfActiveFullValidators: networkMeasurement.nrOfActiveFullValidators,
				nrOfActiveOrganizations: networkMeasurement.nrOfActiveOrganizations,
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
				transitiveQuorumSetSize: networkMeasurement.transitiveQuorumSetSize,
				hasSymmetricTopTier: networkMeasurement.hasSymmetricTopTier
			},
			time: networkMeasurement.time.toISOString(),
			transitiveQuorumSet: Array.from(networkTransitiveQuorumSet)
		});
	});
});
