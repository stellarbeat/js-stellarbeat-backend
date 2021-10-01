import { NodeMeasurementDayV2Repository } from '../repositories/NodeMeasurementDayV2Repository';
import NodeSnapShotRepository from '../repositories/NodeSnapShotRepository';
import CrawlV2 from '../entities/CrawlV2';
import NodeSnapShot from '../entities/NodeSnapShot';
import { injectable } from 'inversify';
import { NodeMeasurementV2Repository } from '../repositories/NodeMeasurementV2Repository';
import NodeSnapShotFactory from '../factory/NodeSnapShotFactory';

/**
 * This service looks at the history data of snapshot and determines if it is no longer needed to track them
 */
@injectable()
export default class NodeSnapShotArchiver {
	protected nodeMeasurementRepository: NodeMeasurementV2Repository;
	protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
	protected nodeSnapShotRepository: NodeSnapShotRepository;
	protected nodeSnapShotFactory: NodeSnapShotFactory;

	constructor(
		nodeMeasurementRepository: NodeMeasurementV2Repository,
		nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
		nodeSnapShotRepository: NodeSnapShotRepository,
		nodeSnapShotFactory: NodeSnapShotFactory
	) {
		this.nodeMeasurementRepository = nodeMeasurementRepository;
		this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
		this.nodeSnapShotRepository = nodeSnapShotRepository;
		this.nodeSnapShotFactory = nodeSnapShotFactory;
	}

	static readonly VALIDATORS_MAX_DAYS_INACTIVE = 7;
	static readonly WATCHERS_MAX_DAYS_INACTIVE = 1;

	async archiveNodes(crawl: CrawlV2) {
		await this.archiveInactiveValidators(crawl);
		await this.archiveInactiveWatchers(crawl);
		await this.nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(
			crawl.time
		);
		await this.demoteValidators(crawl);
	}

	protected async archiveInactiveWatchers(crawl: CrawlV2) {
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
		console.log(
			'[Archiver] Archiving inactive watchers: ' +
				nodeSnapShots.map((snapshot) => snapshot.nodePublicKey.publicKey)
		);
		nodeSnapShots.forEach(
			(nodeSnapShot) => (nodeSnapShot.endDate = crawl.time)
		);

		await this.nodeSnapShotRepository.save(nodeSnapShots); //Will enable after dry running some time
	}

	protected async archiveInactiveValidators(crawl: CrawlV2) {
		const nodePublicKeyStorageIds = (
			await this.nodeMeasurementDayV2Repository.findXDaysInactive(
				crawl.time,
				NodeSnapShotArchiver.VALIDATORS_MAX_DAYS_INACTIVE
			)
		).map((result) => result.nodePublicKeyStorageId);

		if (nodePublicKeyStorageIds.length === 0) return;

		const nodeSnapShots =
			await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(
				nodePublicKeyStorageIds
			);

		nodeSnapShots.forEach(
			(nodeSnapShot) => (nodeSnapShot.endDate = crawl.time)
		);

		await this.nodeSnapShotRepository.save(nodeSnapShots);
	}

	protected async demoteValidators(crawl: CrawlV2) {
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
		);

		console.log(
			'[Archiver] Found validators to demote: ' +
				nodeSnapShots.map(
					(nodeSnapShot) => nodeSnapShot.nodePublicKey.publicKey
				)
		);

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
