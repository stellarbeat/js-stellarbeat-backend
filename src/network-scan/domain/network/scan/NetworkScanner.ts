import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { NodeScan } from '../../node/scan/NodeScan';
import { OrganizationScan } from '../../organization/scan/OrganizationScan';
import { NodeMapper } from '../../../mappers/NodeMapper';
import { OrganizationMapper } from '../../../mappers/OrganizationMapper';
import { TrustGraphFactory } from '../../node/scan/TrustGraphFactory';
import FbasAnalyzerService from '../fbas-analysis/FbasAnalyzerService';
import { NodesInTransitiveNetworkQuorumSetFinder } from './NodesInTransitiveNetworkQuorumSetFinder';
import { QuorumSet } from '../QuorumSet';

@injectable()
export class NetworkScanner {
	constructor(
		private fbasAnalyzer: FbasAnalyzerService,
		private nodeMapper: NodeMapper,
		private organizationMapper: OrganizationMapper,
		private nodesInTransitiveNetworkQuorumSetFinder: NodesInTransitiveNetworkQuorumSetFinder,
		@inject('Logger')
		private logger: Logger
	) {}

	async execute(
		networkScan: NetworkScan,
		nodeScan: NodeScan,
		organizationScan: OrganizationScan,
		networkQuorumSetConfiguration: QuorumSet
	): Promise<Result<NetworkScan, Error>> {
		networkScan.processNodeScan(nodeScan);

		const analysisResultOrError = await this.analyzeFBAS(
			nodeScan,
			organizationScan,
			networkQuorumSetConfiguration
		);

		if (analysisResultOrError.isErr()) {
			return err(analysisResultOrError.error);
		}

		networkScan.addMeasurement(
			analysisResultOrError.value,
			nodeScan,
			organizationScan,
			TrustGraphFactory.create(nodeScan.nodes)
		);

		networkScan.completed = true;

		return ok(networkScan);
	}

	private analyzeFBAS(
		nodeScan: NodeScan,
		organizationScan: OrganizationScan,
		networkQuorumSetConfiguration: QuorumSet
	) {
		const nodesToAnalyze = this.nodesInTransitiveNetworkQuorumSetFinder.find(
			nodeScan.nodes,
			networkQuorumSetConfiguration
		);

		this.logger.info('Analyzing FBAS', {
			nrOfNodes: nodesToAnalyze.length,
			nodes: nodesToAnalyze.map((n) => n.details?.name ?? n.publicKey.value)
		});

		return this.fbasAnalyzer.performAnalysis(
			nodesToAnalyze,
			organizationScan.organizations
		);
	}
}
