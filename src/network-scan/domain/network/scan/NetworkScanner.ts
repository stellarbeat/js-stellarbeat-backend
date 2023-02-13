import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import FbasAnalyzerService from '../FbasAnalyzerService';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared/lib/network';
import { NodeScan } from '../../node/scan/NodeScan';
import { OrganizationScan } from '../../organization/scan/OrganizationScan';
import { NodeMapper } from '../../../mappers/NodeMapper';
import { OrganizationMapper } from '../../../mappers/OrganizationMapper';
import { TrustGraphFactory } from '../../node/scan/TrustGraphFactory';

@injectable()
export class NetworkScanner {
	constructor(
		private fbasAnalyzer: FbasAnalyzerService,
		private nodeMapper: NodeMapper,
		private organizationMapper: OrganizationMapper,
		@inject('Logger')
		private logger: Logger
	) {}

	async execute(
		networkScan: NetworkScan,
		nodeScan: NodeScan,
		organizationScan: OrganizationScan
	): Promise<Result<NetworkScan, Error>> {
		networkScan.processNodeScan(nodeScan);

		const analysisResultOrError = await this.analyzeFBAS(
			nodeScan,
			organizationScan,
			networkScan
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
		networkScan: NetworkScan
	) {
		const nodeDTOs = nodeScan.nodes.map((node) =>
			this.nodeMapper.toNodeDTO(nodeScan.time, node)
		);
		const organizationDTOs = organizationScan.organizations.map(
			(organization) => this.organizationMapper.toOrganizationDTO(organization)
		); //todo: measurement

		const networkDTO: NetworkDTO = new NetworkDTO(
			nodeDTOs,
			organizationDTOs,
			networkScan.time
		);

		return this.fbasAnalyzer.performAnalysis(networkDTO);
	}
}
