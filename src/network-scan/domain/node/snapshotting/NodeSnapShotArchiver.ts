import NetworkScan from '../../network/scan/NetworkScan';
import NodeSnapShot from '../NodeSnapShot';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { Network as NetworkDTO } from '@stellarbeat/js-stellarbeat-shared';
import { NodeSnapShotRepository } from '../NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { NodeMeasurementDayRepository } from '../NodeMeasurementDayRepository';

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
		@inject('Logger') protected logger: Logger
	) {}

	static readonly VALIDATORS_MAX_DAYS_INACTIVE = 7;
	static readonly WATCHERS_MAX_DAYS_INACTIVE = 1;

	async archiveNodes(networkScan: NetworkScan, network: NetworkDTO) {
		await this.archiveInactiveValidators(networkScan, network);
		await this.archiveInactiveWatchers(networkScan);
		await this.nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			networkScan.time
		);
		await this.demoteValidators(networkScan, network);
	}

	protected async archiveInactiveWatchers(crawl: NetworkScan) {
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
		networkScan: NetworkScan,
		network: NetworkDTO
	) {
		const nodes = (
			await this.nodeMeasurementDayRepository.findXDaysInactive(
				networkScan.time,
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
				(nodeSnapShot) => (nodeSnapShot.endDate = networkScan.time)
			);

			await this.nodeSnapShotRepository.save(nodeSnapShotsToBeArchived);
		}
	}

	protected async demoteValidators(
		networkScan: NetworkScan,
		network: NetworkDTO
	) {
		const nodeIds = (
			await this.nodeMeasurementDayRepository.findXDaysActiveButNotValidating(
				networkScan.time,
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
				nodeSnapShot.endDate = networkScan.time;
				snapshotsToSave.push(nodeSnapShot);
				const newNodeSnapshot = nodeSnapShot.copy(networkScan.time);
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
