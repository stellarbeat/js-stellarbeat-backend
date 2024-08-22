import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { NodeScan } from '../../node/scan/NodeScan';
import { OrganizationScan } from '../../organization/scan/OrganizationScan';
import { TrustGraphFactory } from '../../node/scan/TrustGraphFactory';
import FbasAnalyzerService from './fbas-analysis/FbasAnalyzerService';
import { NodesInTransitiveNetworkQuorumSetFinder } from './NodesInTransitiveNetworkQuorumSetFinder';
import { NetworkQuorumSetConfiguration } from '../NetworkQuorumSetConfiguration';
import { Snapshot } from '../../../../core/domain/Snapshot';

@injectable()
export class NetworkScanner {
	constructor(
		private fbasAnalyzer: FbasAnalyzerService,
		private nodesInTransitiveNetworkQuorumSetFinder: NodesInTransitiveNetworkQuorumSetFinder,
		@inject('Logger')
		private logger: Logger
	) {}

	async execute(
		networkScan: NetworkScan,
		nodeScan: NodeScan,
		organizationScan: OrganizationScan,
		networkQuorumSetConfiguration: NetworkQuorumSetConfiguration
	): Promise<Result<NetworkScan, Error>> {
		networkScan.processNodeScan(nodeScan);

		const analysisResultOrError = this.analyzeFBAS(
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
		networkQuorumSetConfiguration: NetworkQuorumSetConfiguration
	) {
		const nodesToAnalyze = this.nodesInTransitiveNetworkQuorumSetFinder.find(
			nodeScan.nodes,
			networkQuorumSetConfiguration
		);

		const organizationsToAnalyze = organizationScan.organizations.filter(
			(organization) => {
				return organization.validators.value.length > 0;
			}
		);

		this.logger.info('Analyzing FBAS', {
			nrOfNodes: nodesToAnalyze.length,
			nodes: nodesToAnalyze.map((n) => n.details?.name ?? n.publicKey.value),
			organizations: organizationsToAnalyze.map(
				(n) => n.name ?? n.organizationId.value
			)
		});

		return this.fbasAnalyzer.performAnalysis(
			nodesToAnalyze,
			organizationsToAnalyze
		);
	}
}
