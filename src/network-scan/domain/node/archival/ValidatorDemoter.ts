import Node from '../Node';
import { inject, injectable } from 'inversify';
import { NodeMeasurementDayRepository } from '../NodeMeasurementDayRepository';
import { Logger } from '../../../../core/services/PinoLogger';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';
import 'reflect-metadata';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { hasNoActiveTrustingNodes } from './hasNoActiveTrustingNodes';
import { NodeScan } from '../scan/NodeScan';

@injectable()
export class ValidatorDemoter {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject('Logger')
		protected logger: Logger
	) {}

	public async demote(
		nodeScan: NodeScan,
		nodesTrustGraph: TrustGraph,
		maxDaysNotValidating: number
	): Promise<void> {
		const validatorsToBeDemoted = await this.findValidatorsToBeDemoted(
			nodeScan,
			nodesTrustGraph,
			maxDaysNotValidating
		);

		if (validatorsToBeDemoted.length > 0) {
			this.logger.info('Demoting validators to watchers', {
				nodes: validatorsToBeDemoted.map((node) => node.publicKey.value)
			});

			validatorsToBeDemoted.forEach((validator) => {
				validator.demoteToWatcher(nodeScan.time);
			});
		}
	}

	private async findValidatorsToBeDemoted(
		nodeScan: NodeScan,
		nodesTrustGraph: TrustGraph,
		maxDaysNotValidating: number
	): Promise<Node[]> {
		const historicallyActiveButNonValidatingNodes =
			await this.findHistoricallyActiveButNonValidatingNodes(
				nodeScan,
				maxDaysNotValidating
			);

		const activeButNonValidatingNodes =
			historicallyActiveButNonValidatingNodes.filter((node) => {
				const latestMeasurement = node.latestMeasurement();
				if (!latestMeasurement) {
					return true;
				}
				return !latestMeasurement.isValidating;
			});

		const nonValidatingValidators = activeButNonValidatingNodes.filter((node) =>
			node.isValidator()
		);

		//to avoid gaps in the network graph, we only demote validators that are trusted by no other validators
		//and thus have no links/edges to other validators
		return this.getValidatorsTrustedByNoOne(
			nonValidatingValidators,
			nodesTrustGraph
		);
	}

	private async findHistoricallyActiveButNonValidatingNodes(
		nodeScan: NodeScan,
		maxDaysNotValidating: number
	) {
		const publicKeys = (
			await this.nodeMeasurementDayRepository.findXDaysActiveButNotValidating(
				nodeScan.time,
				maxDaysNotValidating
			)
		).map((result) => result.publicKey);

		return nodeScan.nodes.filter((node) =>
			publicKeys.includes(node.publicKey.value)
		);
	}

	private getValidatorsTrustedByNoOne(
		nodes: Node[],
		nodesTrustGraph: TrustGraph
	): Node[] {
		const publicKeysToBeArchived = nodes.map((node) => node.publicKey.value);
		return nodes.filter((node) =>
			hasNoActiveTrustingNodes(node, publicKeysToBeArchived, nodesTrustGraph)
		);
	}
}
