import { NodeMeasurementDayV2Repository } from '../repositories/NodeMeasurementDayV2Repository';
import NodeSnapShotRepository from '../repositories/NodeSnapShotRepository';
import NetworkUpdate from '../../../../network-update/domain/NetworkUpdate';
import NodeSnapShot from '../entities/NodeSnapShot';
import { inject, injectable } from 'inversify';
import NodeSnapShotFactory from './factory/NodeSnapShotFactory';
import { Logger } from '../../../../shared/services/PinoLogger';
import { Network } from '@stellarbeat/js-stellar-domain';

/**
 * This service looks at the history data of snapshot and determines if it is no longer needed to track them
 */
@injectable()
export default class NodeSnapShotArchiver {
	constructor(
		protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
		protected nodeSnapShotRepository: NodeSnapShotRepository,
		protected nodeSnapShotFactory: NodeSnapShotFactory,
		@inject('Logger') protected logger: Logger
	) {}

	static readonly VALIDATORS_MAX_DAYS_INACTIVE = 7;
	static readonly WATCHERS_MAX_DAYS_INACTIVE = 1;

	async archiveNodes(networkUpdate: NetworkUpdate, network: Network) {
		await this.archiveInactiveValidators(networkUpdate, network);
		await this.archiveInactiveWatchers(networkUpdate);
		await this.nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			networkUpdate.time
		);
		await this.demoteValidators(networkUpdate, network);
	}

	protected async archiveInactiveWatchers(crawl: NetworkUpdate) {
		const nodePublicKeyStorageIds = (
			await this.nodeMeasurementDayV2Repository.findXDaysInactive(
				crawl.time,
				NodeSnapShotArchiver.WATCHERS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodePublicKeyStorageId);

		if (nodePublicKeyStorageIds.length === 0) return;

		let nodeSnapShots =
			await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(
				nodePublicKeyStorageIds
			);
		nodeSnapShots = nodeSnapShots.filter(
			(nodeSnapShot) => nodeSnapShot.quorumSet === null
		);

		if (nodeSnapShots.length > 0) {
			this.logger.info('Archiving inactive watchers', {
				nodes: nodeSnapShots.map((snapshot) => snapshot.nodePublicKey.publicKey)
			});

			nodeSnapShots.forEach(
				(nodeSnapShot) => (nodeSnapShot.endDate = crawl.time)
			);

			await this.nodeSnapShotRepository.save(nodeSnapShots);
		}
	}

	protected async archiveInactiveValidators(
		crawl: NetworkUpdate,
		network: Network
	) {
		const nodePublicKeyStorageIds = (
			await this.nodeMeasurementDayV2Repository.findXDaysInactive(
				crawl.time,
				NodeSnapShotArchiver.VALIDATORS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodePublicKeyStorageId);

		if (nodePublicKeyStorageIds.length === 0) return;

		let nodeSnapShots =
			await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(
				nodePublicKeyStorageIds
			);

		//filter out validators that are trusted by other active validators
		nodeSnapShots = this.filterTrustedValidators(nodeSnapShots, network);

		if (nodeSnapShots.length > 0) {
			this.logger.info('Archiving inactive validators', {
				nodes: nodeSnapShots.map((snapshot) => snapshot.nodePublicKey.publicKey)
			});
			nodeSnapShots.forEach(
				(nodeSnapShot) => (nodeSnapShot.endDate = crawl.time)
			);

			await this.nodeSnapShotRepository.save(nodeSnapShots);
		}
	}

	protected async demoteValidators(crawl: NetworkUpdate, network: Network) {
		const nodePublicKeyStorageIds = (
			await this.nodeMeasurementDayV2Repository.findXDaysActiveButNotValidating(
				crawl.time,
				NodeSnapShotArchiver.VALIDATORS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodePublicKeyStorageId);

		if (nodePublicKeyStorageIds.length === 0) return;

		let nodeSnapShots =
			await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(
				nodePublicKeyStorageIds
			);

		nodeSnapShots = nodeSnapShots.filter(
			(nodeSnapShot) => nodeSnapShot.quorumSet !== null
		); //demote only validators

		//filter out validators that are trusted by other active validators.
		nodeSnapShots = this.filterTrustedValidators(nodeSnapShots, network);

		if (nodeSnapShots.length > 0) {
			this.logger.info('Demoting validators to watchers', {
				nodes: nodeSnapShots.map(
					(nodeSnapShot) => nodeSnapShot.nodePublicKey.publicKey
				)
			});

			const snapshotsToSave: NodeSnapShot[] = [];
			nodeSnapShots.forEach((nodeSnapShot) => {
				nodeSnapShot.endDate = crawl.time;
				snapshotsToSave.push(nodeSnapShot);
				const newNodeSnapshot = this.nodeSnapShotFactory.createUpdatedSnapShot(
					nodeSnapShot,
					nodeSnapShot.toNode(crawl.time),
					crawl.time,
					null
				);
				newNodeSnapshot.quorumSet = null; //demote to validator
				snapshotsToSave.push(newNodeSnapshot);
			});

			await this.nodeSnapShotRepository.save(snapshotsToSave); //Will enable after dry running some time
		}
	}

	private filterTrustedValidators(
		nodeSnapShots: NodeSnapShot[],
		network: Network
	): NodeSnapShot[] {
		const publicKeys = nodeSnapShots.map(
			(snapShot) => snapShot.nodePublicKey.publicKey
		);

		return nodeSnapShots.filter((snapShot) => {
			network
				.getTrustingNodes(
					network.getNodeByPublicKey(snapShot.nodePublicKey.publicKey)
				)
				.filter((trustingNode) => publicKeys.includes(trustingNode.publicKey))
				.length > 0;
		});
	}
}
