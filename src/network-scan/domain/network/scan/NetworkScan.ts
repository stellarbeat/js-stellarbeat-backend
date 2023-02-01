import {
	Entity,
	Column,
	Index,
	ValueTransformer,
	PrimaryGeneratedColumn
} from 'typeorm';
import { CoreEntity } from '../../../../core/domain/CoreEntity';
import NetworkMeasurement from '../NetworkMeasurement';
import { AnalysisResult } from '../FbasAnalyzerService';
import { NodeScan } from '../../node/scan/NodeScan';
import { OrganizationScan } from '../../organization/scan/OrganizationScan';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';

export const bigIntTransformer: ValueTransformer = {
	to: (entityValue: bigint) => entityValue,
	from: (databaseValue: string): bigint => BigInt(databaseValue)
};

@Entity({})
@Index(['time', 'completed'])
export default class NetworkScan extends CoreEntity {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number; //needed for aggregation rollup

	@Column('timestamptz', { nullable: false })
	time: Date;

	@Column('simple-array', { default: [] })
	ledgers: number[] = [];

	@Column('bigint', {
		default: 0,
		transformer: bigIntTransformer,
		nullable: false
	})
	latestLedger = BigInt(0);

	@Column('timestamptz', { nullable: true })
	latestLedgerCloseTime: Date | null = null;

	@Column('boolean', { default: false })
	completed = false;

	measurement: NetworkMeasurement | null = null;

	constructor(time: Date) {
		super();
		this.time = time;
	}

	processNodeScan(nodeScan: NodeScan): void {
		this.latestLedgerCloseTime = nodeScan.latestLedgerCloseTime;
		this.ledgers = nodeScan.processedLedgers;
		this.latestLedger = nodeScan.latestLedger;
	}

	addMeasurement(
		analysisResult: AnalysisResult,
		nodeScan: NodeScan,
		orgScan: OrganizationScan,
		nodeTrustGraph: TrustGraph
	): void {
		const networkMeasurement = new NetworkMeasurement(this.time);

		networkMeasurement.hasQuorumIntersection =
			analysisResult.hasQuorumIntersection;
		networkMeasurement.hasSymmetricTopTier = analysisResult.hasSymmetricTopTier;

		networkMeasurement.minBlockingSetSize =
			analysisResult.minimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetFilteredSize =
			analysisResult.minimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minBlockingSetOrgsSize =
			analysisResult.orgMinimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetCountrySize =
			analysisResult.countryMinimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetISPSize =
			analysisResult.ispMinimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetOrgsFilteredSize =
			analysisResult.orgMinimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minBlockingSetCountryFilteredSize =
			analysisResult.countryMinimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minBlockingSetISPFilteredSize =
			analysisResult.ispMinimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minSplittingSetSize =
			analysisResult.minimalSplittingSetsMinSize;
		networkMeasurement.minSplittingSetOrgsSize =
			analysisResult.orgMinimalSplittingSetsMinSize;
		networkMeasurement.minSplittingSetCountrySize =
			analysisResult.countryMinimalSplittingSetsMinSize;
		networkMeasurement.minSplittingSetISPSize =
			analysisResult.ispMinimalSplittingSetsMinSize;
		networkMeasurement.topTierSize = analysisResult.topTierSize;
		networkMeasurement.topTierOrgsSize = analysisResult.orgTopTierSize;
		networkMeasurement.nrOfActiveWatchers = nodeScan.getActiveWatchersCount();
		networkMeasurement.nrOfActiveValidators =
			nodeScan.getActiveValidatorsCount();
		networkMeasurement.nrOfActiveFullValidators =
			nodeScan.getActiveFullValidatorsCount();
		networkMeasurement.nrOfActiveOrganizations =
			orgScan.getAvailableOrganizationsCount();
		networkMeasurement.transitiveQuorumSetSize =
			nodeTrustGraph.networkTransitiveQuorumSet.size;
		networkMeasurement.hasTransitiveQuorumSet =
			nodeTrustGraph.hasNetworkTransitiveQuorumSet();

		this.measurement = networkMeasurement;
	}
}
