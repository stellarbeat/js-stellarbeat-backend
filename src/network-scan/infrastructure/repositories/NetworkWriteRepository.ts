import {
	Network as NetworkDTO,
	Organization as OrganizationDTO
} from '@stellarbeat/js-stellar-domain';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import { Connection } from 'typeorm';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import NodeSnapShot from '../../domain/node/NodeSnapShot';
import OrganizationSnapShot from '../../domain/organization/OrganizationSnapShot';
import OrganizationMeasurement from '../../domain/organization/OrganizationMeasurement';
import NetworkMeasurement from '../../domain/network/NetworkMeasurement';
import NodeSnapShotArchiver from '../../domain/node/snapshotting/NodeSnapShotArchiver';
import { inject, injectable } from 'inversify';
import FbasAnalyzerService from '../../domain/network/FbasAnalyzerService';
import SnapShotter from '../../domain/snapshotting/SnapShotter';
import { Result, err, ok } from 'neverthrow';
import { Logger } from '../../../core/services/PinoLogger';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { CustomError } from '../../../core/errors/CustomError';
import { MeasurementsRollupService } from '../../domain/measurement-aggregation/MeasurementsRollupService';
import { NETWORK_TYPES } from '../di/di-types';
import { NetworkScanRepository } from '../../domain/network/scan/NetworkScanRepository';
import { NodeMapper } from '../../services/NodeMapper';

export class NetworkPersistError extends CustomError {
	constructor(cause?: Error) {
		super('Failed persisting network', NetworkPersistError.name, cause);
	}
}

@injectable()
export class NetworkWriteRepository {
	constructor(
		@inject(NETWORK_TYPES.NetworkScanRepository)
		protected networkScanRepository: NetworkScanRepository,
		protected snapShotter: SnapShotter,
		@inject(NETWORK_TYPES.MeasurementsRollupService)
		protected measurementRollupService: MeasurementsRollupService,
		protected archiver: NodeSnapShotArchiver,
		protected connection: Connection,
		protected fbasAnalyzer: FbasAnalyzerService, //todo: does not really belong here
		@inject('Logger') protected logger: Logger,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async save(
		scan: NetworkScan,
		networkDTO: NetworkDTO
	): Promise<Result<NetworkScan, Error>> {
		try {
			await this.networkScanRepository.save(scan);

			const snapShots = await this.snapShotter.updateOrCreateSnapShots(
				networkDTO.nodes,
				networkDTO.organizations,
				scan.time
			);

			await this.createNodeMeasurements(
				networkDTO,
				snapShots.nodeSnapShots,
				scan
			);

			await this.createOrganizationMeasurements(
				networkDTO,
				snapShots.organizationSnapShots,
				scan
			);

			const result = await this.createNetworkMeasurements(networkDTO, scan);

			if (result.isErr()) {
				return err(result.error);
			}

			scan.completed = true;
			await this.networkScanRepository.save(scan);

			/*
            Step 3: rollup measurements
             */
			await this.measurementRollupService.rollupMeasurements(scan);

			/*
            Step 4: Archiving
            */
			await this.archiver.archiveNodes(scan, networkDTO); //todo move up?

			return ok(scan);
		} catch (e) {
			if (!(e instanceof Error)) return err(new NetworkPersistError());

			return err(new NetworkPersistError(e));
		}
	}

	private async createNetworkMeasurements(
		networkDTO: NetworkDTO,
		scan: NetworkScan
	): Promise<Result<undefined, Error>> {
		const networkMeasurement = new NetworkMeasurement(scan.time);

		const analysisResult = await this.fbasAnalyzer.performAnalysis(networkDTO);

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
			networkDTO.networkStatistics.nrOfActiveWatchers;
		networkMeasurement.nrOfActiveValidators =
			networkDTO.networkStatistics.nrOfActiveValidators;
		networkMeasurement.nrOfActiveFullValidators =
			networkDTO.networkStatistics.nrOfActiveFullValidators;
		networkMeasurement.nrOfActiveOrganizations =
			networkDTO.networkStatistics.nrOfActiveOrganizations;
		networkMeasurement.transitiveQuorumSetSize =
			networkDTO.networkStatistics.transitiveQuorumSetSize;
		networkMeasurement.hasTransitiveQuorumSet =
			networkDTO.networkStatistics.hasTransitiveQuorumSet;

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
		networkDTO: NetworkDTO,
		allSnapShots: OrganizationSnapShot[],
		scan: NetworkScan
	) {
		if (allSnapShots.length <= 0) {
			return;
		}

		const organizationMeasurements: OrganizationMeasurement[] = [];
		allSnapShots.forEach((snapShot) => {
			const organization = networkDTO.getOrganizationById(
				snapShot.organization.organizationId.value
			);

			if (!organization.unknown) {
				const organizationMeasurement = new OrganizationMeasurement(
					scan.time,
					snapShot.organization
				);
				organizationMeasurement.isSubQuorumAvailable =
					this.getOrganizationFailAt(organization, networkDTO) >= 1;
				organization.subQuorumAvailable =
					organizationMeasurement.isSubQuorumAvailable; //todo needs to move up
				organizationMeasurement.index = 0; //future-proof
				organizationMeasurements.push(organizationMeasurement);
			}
		});

		if (organizationMeasurements.length <= 0) return;

		await this.connection.manager.insert(
			OrganizationMeasurement,
			organizationMeasurements
		);
	}

	private getOrganizationFailAt(
		organization: OrganizationDTO,
		network: NetworkDTO
	) {
		const nrOfValidatingNodes = organization.validators
			.map((validator) => network.getNodeByPublicKey(validator))
			.filter((validator) => validator.isValidating).length;
		return nrOfValidatingNodes - organization.subQuorumThreshold + 1;
	}

	private async createNodeMeasurements(
		networkDTO: NetworkDTO,
		allSnapShots: NodeSnapShot[],
		scan: NetworkScan
	) {
		if (allSnapShots.length <= 0) {
			return;
		}
		const publicKeys: Set<string> = new Set();

		const nodeMeasurements: NodeMeasurement[] = [];
		allSnapShots.forEach((snapShot) => {
			let node = networkDTO.getNodeByPublicKey(snapShot.node.publicKey.value);

			if (node.unknown) {
				//entity was not returned from crawler, so we mark it as inactive
				//todo: index will be zero, need a better solution here.
				node = NodeMapper.toNodeDTO(scan.time, snapShot);
			}

			if (!publicKeys.has(snapShot.node.publicKey.value)) {
				publicKeys.add(snapShot.node.publicKey.value);
				const nodeMeasurement = NodeMeasurement.fromNodeDTO(
					scan.time,
					snapShot.node,
					node
				);
				nodeMeasurements.push(nodeMeasurement);
			} else {
				const message =
					'Node has multiple active snapshots: ' +
					snapShot.node.publicKey.value;
				this.logger.error(message);
				this.exceptionLogger.captureException(new Error(message));
			}
		});

		await this.connection.manager.insert(NodeMeasurement, nodeMeasurements);
	}
}
