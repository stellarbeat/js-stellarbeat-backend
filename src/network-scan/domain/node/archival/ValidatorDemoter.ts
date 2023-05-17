import Node from '../Node';
import { inject, injectable } from 'inversify';
import { NodeMeasurementDayRepository } from '../NodeMeasurementDayRepository';
import { NodeRepository } from '../NodeRepository';
import { Logger } from '../../../../core/services/PinoLogger';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';
import 'reflect-metadata';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';

@injectable()
export class ValidatorDemoter {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.NodeRepository)
		protected nodeRepository: NodeRepository,
		@inject('Logger')
		protected logger: Logger
	) {}

	public async demote(
		time: Date,
		nodesTrustGraph: TrustGraph,
		maxDaysNotValidating: number
	) {
		const validatorsToBeDemoted = await this.findValidatorsToBeDemoted(
			time,
			nodesTrustGraph,
			maxDaysNotValidating
		);

		if (validatorsToBeDemoted.length > 0) {
			await this.demoteAndPersistValidators(validatorsToBeDemoted, time);
		}
	}

	private async demoteAndPersistValidators(
		validatorsToBeDemoted: Node[],
		time: Date
	) {
		this.logger.info('Demoting validators to watchers', {
			nodes: validatorsToBeDemoted.map((node) => node.publicKey.value)
		});

		validatorsToBeDemoted.forEach((validator) => {
			validator.demoteToWatcher(time);
		});

		await this.nodeRepository.save(validatorsToBeDemoted, time);
	}

	private async findValidatorsToBeDemoted(
		time: Date,
		nodesTrustGraph: TrustGraph,
		maxDaysNotValidating: number
	): Promise<Node[]> {
		const publicKeys = await this.findDemotionCandidates(
			time,
			maxDaysNotValidating
		);
		if (publicKeys.length === 0) return [];

		const nodes = await this.nodeRepository.findActiveByPublicKey(publicKeys);
		const validators = nodes.filter((node) => node.isValidator());

		//to avoid gaps in the network graph, we only demote validators that are trusted by no other validators
		//and thus have no links/edges to other validators
		return this.getValidatorsTrustedByNoOne(validators, nodesTrustGraph);
	}

	private async findDemotionCandidates(
		time: Date,
		maxDaysNotValidating: number
	) {
		return (
			await this.nodeMeasurementDayRepository.findXDaysActiveButNotValidating(
				time,
				maxDaysNotValidating
			)
		).map((result) => result.publicKey);
	}

	private getValidatorsTrustedByNoOne(
		nodes: Node[],
		nodesTrustGraph: TrustGraph
	): Node[] {
		const publicKeysToBeArchived = nodes.map((node) => node.publicKey.value);
		return nodes.filter((node) => {
			const vertex = nodesTrustGraph.getVertex(node.publicKey.value);
			if (!vertex) {
				this.logger.error(
					`Validator Demotion Error: Node ${node.publicKey.value} not found in trust graph.`
				);
				return false; //don't archive but look into why this data corruption happened
			}
			const trustingNodes = nodesTrustGraph.getParents(vertex);

			const trustingNodesNotScheduledForArchival = Array.from(
				trustingNodes
			).filter(
				(trustingNode) => !publicKeysToBeArchived.includes(trustingNode.key)
			);

			return trustingNodesNotScheduledForArchival.length === 0;
		});
	}
}
