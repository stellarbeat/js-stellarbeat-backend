import NetworkUpdate from '../../network/scan/NetworkUpdate';
import NodeSnapShot from '../NodeSnapShot';
import { inject, injectable } from 'inversify';
import NodeSnapShotFactory from './NodeSnapShotFactory';
import { Logger } from '../../../../core/services/PinoLogger';
import { Network as NetworkDTO } from '@stellarbeat/js-stellar-domain';
import { NodeSnapShotRepository } from '../NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { NodeMeasurementDayRepository } from '../NodeMeasurementDayRepository';
import { NodeMapper } from '../../../services/NodeMapper';

/**
 * This service looks at the history data of snapshot and determines if it is no longer needed to track them
 */
@injectable()
export default class NodeSnapShotArchiver {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		protected nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected nodeSnapShotFactory: NodeSnapShotFactory,
		@inject('Logger') protected logger: Logger
	) {}

	static readonly VALIDATORS_MAX_DAYS_INACTIVE = 7;
	static readonly WATCHERS_MAX_DAYS_INACTIVE = 1;

	async archiveNodes(networkUpdate: NetworkUpdate, network: NetworkDTO) {
		await this.archiveInactiveValidators(networkUpdate, network);
		await this.archiveInactiveWatchers(networkUpdate);
		await this.nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			networkUpdate.time
		);
		await this.demoteValidators(networkUpdate, network);
	}

	protected async archiveInactiveWatchers(crawl: NetworkUpdate) {
		const nodeIds = (
			await this.nodeMeasurementDayRepository.findXDaysInactive(
				crawl.time,
				NodeSnapShotArchiver.WATCHERS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodeId);

		if (nodeIds.length === 0) return;

		let nodeSnapShots = await this.nodeSnapShotRepository.findActiveByNodeId(
			nodeIds
		);
		nodeSnapShots = nodeSnapShots.filter(
			(nodeSnapShot) => nodeSnapShot.quorumSet === null
		);

		if (nodeSnapShots.length > 0) {
			this.logger.info('Archiving inactive watchers', {
				nodes: nodeSnapShots.map((snapshot) => snapshot.node.publicKey.value)
			});

			nodeSnapShots.forEach(
				(nodeSnapShot) => (nodeSnapShot.endDate = crawl.time)
			);

			await this.nodeSnapShotRepository.save(nodeSnapShots);
		}
	}

	protected async archiveInactiveValidators(
		crawl: NetworkUpdate,
		network: NetworkDTO
	) {
		const nodes = (
			await this.nodeMeasurementDayRepository.findXDaysInactive(
				crawl.time,
				NodeSnapShotArchiver.VALIDATORS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodeId);

		if (nodes.length === 0) return;

		let nodeSnapShotsToBeArchived =
			await this.nodeSnapShotRepository.findActiveByNodeId(nodes);

		//filter out validators that are trusted by other active validators
		nodeSnapShotsToBeArchived = this.getValidatorsTrustedByNoOtherActiveNodes(
			nodeSnapShotsToBeArchived,
			network
		);

		if (nodeSnapShotsToBeArchived.length > 0) {
			this.logger.info('Archiving inactive validators', {
				nodes: nodeSnapShotsToBeArchived.map(
					(snapshot) => snapshot.node.publicKey.value
				)
			});
			nodeSnapShotsToBeArchived.forEach(
				(nodeSnapShot) => (nodeSnapShot.endDate = crawl.time)
			);

			await this.nodeSnapShotRepository.save(nodeSnapShotsToBeArchived);
		}
	}

	protected async demoteValidators(crawl: NetworkUpdate, network: NetworkDTO) {
		const nodeIds = (
			await this.nodeMeasurementDayRepository.findXDaysActiveButNotValidating(
				crawl.time,
				NodeSnapShotArchiver.VALIDATORS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodeId);

		if (nodeIds.length === 0) return;

		let nodeSnapShotsToBeDemoted =
			await this.nodeSnapShotRepository.findActiveByNodeId(nodeIds);

		nodeSnapShotsToBeDemoted = nodeSnapShotsToBeDemoted.filter(
			(nodeSnapShot) => nodeSnapShot.quorumSet !== null
		); //demote only validators

		//filter out validators that are trusted by other active validators.
		nodeSnapShotsToBeDemoted = this.getValidatorsTrustedByNoOtherActiveNodes(
			nodeSnapShotsToBeDemoted,
			network
		);

		if (nodeSnapShotsToBeDemoted.length > 0) {
			this.logger.info('Demoting validators to watchers', {
				nodes: nodeSnapShotsToBeDemoted.map(
					(nodeSnapShot) => nodeSnapShot.node.publicKey.value
				)
			});

			const snapshotsToSave: NodeSnapShot[] = [];
			nodeSnapShotsToBeDemoted.forEach((nodeSnapShot) => {
				nodeSnapShot.endDate = crawl.time;
				snapshotsToSave.push(nodeSnapShot);
				const newNodeSnapshot = this.nodeSnapShotFactory.createUpdatedSnapShot(
					nodeSnapShot,
					NodeMapper.toNodeDTO(crawl.time, nodeSnapShot),
					crawl.time,
					null
				);
				newNodeSnapshot.quorumSet = null; //demote to validator
				snapshotsToSave.push(newNodeSnapshot);
			});

			await this.nodeSnapShotRepository.save(snapshotsToSave); //Will enable after dry running some time
		}
	}

	private getValidatorsTrustedByNoOtherActiveNodes(
		nodeSnapShots: NodeSnapShot[],
		network: NetworkDTO
	): NodeSnapShot[] {
		return nodeSnapShots.filter((snapShot) => {
			//helper data structure
			const publicKeysToBeArchived = nodeSnapShots.map(
				(snapShot) => snapShot.node.publicKey.value
			);

			const trustingNodes = network.getTrustingNodes(
				network.getNodeByPublicKey(snapShot.node.publicKey.value)
			);

			const trustingNodesNotScheduledForArchival = trustingNodes.filter(
				(node) => !publicKeysToBeArchived.includes(node.publicKey)
			);

			return trustingNodesNotScheduledForArchival.length === 0;
		});
	}
}
