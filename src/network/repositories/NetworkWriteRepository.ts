import { Network, Organization } from '@stellarbeat/js-stellar-domain';
import { NetworkUpdateRepository } from '../infra/database/repositories/NetworkUpdateRepository';
import NetworkUpdate from '../domain/NetworkUpdate';
import { Connection } from 'typeorm';
import NodeMeasurementV2 from '../infra/database/entities/NodeMeasurementV2';
import NodeSnapShot from '../infra/database/entities/NodeSnapShot';
import OrganizationSnapShot from '../infra/database/entities/OrganizationSnapShot';
import OrganizationMeasurement from '../infra/database/entities/OrganizationMeasurement';
import NetworkMeasurement from '../infra/database/entities/NetworkMeasurement';
import MeasurementsRollupService from '../infra/database/measurements-rollup/MeasurementsRollupService';
import NodeSnapShotArchiver from '../infra/database/snapshotting/NodeSnapShotArchiver';
import { inject, injectable } from 'inversify';
import FbasAnalyzerService from '../services/FbasAnalyzerService';
import SnapShotter from '../infra/database/snapshotting/SnapShotter';
import { Result, err, ok } from 'neverthrow';
import { Logger } from '../../shared/services/PinoLogger';
import { ExceptionLogger } from '../../shared/services/ExceptionLogger';
import { CustomError } from '../../shared/errors/CustomError';

export class NetworkPersistError extends CustomError {
	constructor(cause?: Error) {
		super('Failed persisting network', NetworkPersistError.name, cause);
	}
}

@injectable()
export class NetworkWriteRepository {
	constructor(
		protected networkUpdateRepository: NetworkUpdateRepository,
		protected snapShotter: SnapShotter,
		protected measurementRollupService: MeasurementsRollupService,
		protected archiver: NodeSnapShotArchiver,
		protected connection: Connection,
		protected fbasAnalyzer: FbasAnalyzerService, //todo: does not really belong here
		@inject('Logger') protected logger: Logger,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async save(
		networkUpdate: NetworkUpdate,
		network: Network
	): Promise<Result<NetworkUpdate, Error>> {
		try {
			await this.networkUpdateRepository.save(networkUpdate);

			const snapShots = await this.snapShotter.updateOrCreateSnapShots(
				network.nodes,
				network.organizations,
				networkUpdate.time
			);

			await this.createNodeMeasurements(
				network,
				snapShots.nodeSnapShots,
				networkUpdate
			);

			await this.createOrganizationMeasurements(
				network,
				snapShots.organizationSnapShots,
				networkUpdate
			);

			const result = await this.createNetworkMeasurements(
				network,
				networkUpdate
			);

			if (result.isErr()) {
				return err(result.error);
			}

			networkUpdate.completed = true;
			await this.networkUpdateRepository.save(networkUpdate);

			/*
            Step 3: rollup measurements
             */
			await this.measurementRollupService.rollupMeasurements(networkUpdate);
			/*
            Step 4: Archiving
            */
			await this.archiver.archiveNodes(networkUpdate); //todo move up?
			/*
			Step 5: Create events for notifications
			 */

			return ok(networkUpdate);
		} catch (e) {
			if (!(e instanceof Error)) return err(new NetworkPersistError());

			return err(new NetworkPersistError(e));
		}
	}

	private async createNetworkMeasurements(
		network: Network,
		networkUpdate: NetworkUpdate
	): Promise<Result<undefined, Error>> {
		const networkMeasurement = new NetworkMeasurement(networkUpdate.time);

		const analysisResult = await this.fbasAnalyzer.performAnalysis(network);

		if (analysisResult.isErr()) return err(analysisResult.error);

		const analysis = analysisResult.value;
		this.logger.info('Network analysis cache hit? ' + analysis.cacheHit);

		networkMeasurement.hasQuorumIntersection = analysis.hasQuorumIntersection;
		networkMeasurement.hasSymmetricTopTier = analysis.hasSymmetricTopTier;

		networkMeasurement.minBlockingSetSize = analysis.minimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetFilteredSize =
			analysis.minimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minBlockingSetOrgsSize =
			analysis.orgMinimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetCountrySize =
			analysis.countryMinimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetISPSize =
			analysis.ispMinimalBlockingSetsMinSize;
		networkMeasurement.minBlockingSetOrgsFilteredSize =
			analysis.orgMinimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minBlockingSetCountryFilteredSize =
			analysis.countryMinimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minBlockingSetISPFilteredSize =
			analysis.ispMinimalBlockingSetsFaultyNodesFilteredMinSize;
		networkMeasurement.minSplittingSetSize =
			analysis.minimalSplittingSetsMinSize;
		networkMeasurement.minSplittingSetOrgsSize =
			analysis.orgMinimalSplittingSetsMinSize;
		networkMeasurement.minSplittingSetCountrySize =
			analysis.countryMinimalSplittingSetsMinSize;
		networkMeasurement.minSplittingSetISPSize =
			analysis.ispMinimalSplittingSetsMinSize;
		networkMeasurement.topTierSize = analysis.topTierSize;
		networkMeasurement.topTierOrgsSize = analysis.orgTopTierSize;
		networkMeasurement.nrOfActiveWatchers =
			network.networkStatistics.nrOfActiveWatchers;
		networkMeasurement.nrOfActiveValidators =
			network.networkStatistics.nrOfActiveValidators;
		networkMeasurement.nrOfActiveFullValidators =
			network.networkStatistics.nrOfActiveFullValidators;
		networkMeasurement.nrOfActiveOrganizations =
			network.networkStatistics.nrOfActiveOrganizations;
		networkMeasurement.transitiveQuorumSetSize =
			network.networkStatistics.transitiveQuorumSetSize;
		networkMeasurement.hasTransitiveQuorumSet =
			network.networkStatistics.hasTransitiveQuorumSet;

		try {
			await this.connection.manager.insert(
				NetworkMeasurement,
				networkMeasurement
			);
		} catch (e) {
			if (e instanceof Error) return err(e);

			return err(new Error('Error inserting network measurement in db'));
		}

		return ok(undefined);
	}

	private async createOrganizationMeasurements(
		network: Network,
		allSnapShots: OrganizationSnapShot[],
		networkUpdate: NetworkUpdate
	) {
		if (allSnapShots.length <= 0) {
			return;
		}

		const organizationMeasurements: OrganizationMeasurement[] = [];
		allSnapShots.forEach((snapShot) => {
			const organization = network.getOrganizationById(
				snapShot.organizationIdStorage.organizationId
			);

			if (!organization.unknown) {
				const organizationMeasurement = new OrganizationMeasurement(
					networkUpdate.time,
					snapShot.organizationIdStorage
				);
				organizationMeasurement.isSubQuorumAvailable =
					this.getOrganizationFailAt(organization, network) >= 1;
				organization.subQuorumAvailable =
					organizationMeasurement.isSubQuorumAvailable; //todo needs to move up
				organizationMeasurement.index = 0; //future proof
				organizationMeasurements.push(organizationMeasurement);
			}
		});

		if (organizationMeasurements.length <= 0) return;

		await this.connection.manager.insert(
			OrganizationMeasurement,
			organizationMeasurements
		);
	}

	private getOrganizationFailAt(organization: Organization, network: Network) {
		const nrOfValidatingNodes = organization.validators
			.map((validator) => network.getNodeByPublicKey(validator))
			.filter((validator) => validator.isValidating).length;
		return nrOfValidatingNodes - organization.subQuorumThreshold + 1;
	}

	private async createNodeMeasurements(
		network: Network,
		allSnapShots: NodeSnapShot[],
		networkUpdate: NetworkUpdate
	) {
		if (allSnapShots.length <= 0) {
			return;
		}
		const publicKeys: Set<string> = new Set();

		const nodeMeasurements: NodeMeasurementV2[] = [];
		allSnapShots.forEach((snapShot) => {
			let node = network.getNodeByPublicKey(snapShot.nodePublicKey.publicKey);

			if (node.unknown) {
				//entity was not returned from crawler, so we mark it as inactive
				//todo: index will be zero, need a better solution here.
				node = snapShot.toNode(networkUpdate.time);
			}

			if (!publicKeys.has(snapShot.nodePublicKey.publicKey)) {
				publicKeys.add(snapShot.nodePublicKey.publicKey);
				const nodeMeasurement = NodeMeasurementV2.fromNode(
					networkUpdate.time,
					snapShot.nodePublicKey,
					node
				);
				nodeMeasurements.push(nodeMeasurement);
			} else {
				const message =
					'Node has multiple active snapshots: ' +
					snapShot.nodePublicKey.publicKey;
				this.logger.error(message);
				this.exceptionLogger.captureException(new Error(message));
			}
		});

		await this.connection.manager.insert(NodeMeasurementV2, nodeMeasurements);
	}
}
