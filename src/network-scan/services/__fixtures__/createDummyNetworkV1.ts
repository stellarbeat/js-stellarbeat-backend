import {
	NetworkV1,
	NodeV1,
	OrganizationV1
} from '@stellarbeat/js-stellarbeat-shared';
import { NetworkStatisticsV1 } from '@stellarbeat/js-stellarbeat-shared/lib/dto/network-v1';

export function createDummyNetworkV1(
	nodes: NodeV1[] = [],
	organizations: OrganizationV1[] = []
): NetworkV1 {
	return {
		time: new Date().toISOString(),
		scc: [],
		name: 'name',
		id: 'id',
		nodes: nodes,
		organizations: organizations,
		statistics: createDummyNetworkStatisticsV1(),
		latestLedger: '1',
		transitiveQuorumSet: [],
		passPhrase: 'passPhrase'
	};
}

export function createDummyNetworkStatisticsV1(): NetworkStatisticsV1 {
	return {
		time: new Date().toISOString(),
		hasQuorumIntersection: true,
		hasSymmetricTopTier: true,
		hasTransitiveQuorumSet: true,
		minBlockingSetCountryFilteredSize: 1,
		minBlockingSetCountrySize: 1,
		minBlockingSetFilteredSize: 1,
		minBlockingSetISPFilteredSize: 1,
		minBlockingSetISPSize: 1,
		minBlockingSetOrgsFilteredSize: 1,
		minBlockingSetOrgsSize: 1,
		minBlockingSetSize: 1,
		minSplittingSetISPSize: 1,
		minSplittingSetOrgsSize: 1,
		minSplittingSetSize: 1,
		nrOfActiveFullValidators: 1,
		nrOfActiveOrganizations: 1,
		nrOfActiveValidators: 1,
		nrOfActiveWatchers: 1,
		topTierOrgsSize: 1,
		topTierSize: 1,
		transitiveQuorumSetSize: 1,
		minSplittingSetCountrySize: 1
	};
}
