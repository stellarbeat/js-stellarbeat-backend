import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';
import { inject, injectable } from 'inversify';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { NodeMeasurementDayRepository } from '../NodeMeasurementDayRepository';
import Node from '../Node';
import { NodeScan } from '../scan/NodeScan';
import { hasNoActiveTrustingNodes } from './hasNoActiveTrustingNodes';
import 'reflect-metadata';
import { Logger } from '../../../../core/services/PinoLogger';

@injectable()
export class InactiveNodesArchiver {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		private nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject('Logger') private logger: Logger
	) {}

	async archive(
		nodeScan: NodeScan,
		nodesTrustGraph: TrustGraph,
		maxDaysInactive: number
	): Promise<void> {
		const historicallyInactiveNodes = await this.findHistoricallyInactiveNodes(
			nodeScan,
			maxDaysInactive
		);

		const inactiveNodes = historicallyInactiveNodes.filter((node) => {
			const latestMeasurement = node.latestMeasurement();
			if (!latestMeasurement) {
				return true;
			}
			return !latestMeasurement.isActive;
		});

		const inactiveNodesTrustedByNoActiveNodes =
			this.getNodesTrustedByNoOtherActiveNodes(inactiveNodes, nodesTrustGraph);
		//we don't want gaps in the trust graph

		if (inactiveNodesTrustedByNoActiveNodes.length > 0) {
			inactiveNodesTrustedByNoActiveNodes.forEach((node) => {
				node.archive(nodeScan.time);
			});

			this.logger.info('Archived inactive nodes', {
				nodes: inactiveNodesTrustedByNoActiveNodes.map(
					(node) => node.publicKey.value
				)
			});
		}
	}

	private async findHistoricallyInactiveNodes(
		nodeScan: NodeScan,
		maxDaysInactive: number
	) {
		const publicKeys = (
			await this.nodeMeasurementDayRepository.findXDaysInactive(
				nodeScan.time,
				maxDaysInactive
			)
		).map((result) => result.publicKey);

		if (publicKeys.length === 0) return [];

		return nodeScan.nodes.filter((node) =>
			publicKeys.includes(node.publicKey.value)
		);
	}

	private getNodesTrustedByNoOtherActiveNodes(
		inactiveNodes: Node[],
		nodesTrustGraph: TrustGraph
	): Node[] {
		const inactivePublicKeys = inactiveNodes.map(
			(node) => node.publicKey.value
		);
		return inactiveNodes.filter((node) =>
			hasNoActiveTrustingNodes(node, inactivePublicKeys, nodesTrustGraph)
		);
	}
}
