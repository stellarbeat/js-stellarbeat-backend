import { CrawlerService } from './node-crawl/CrawlerService';
import { HomeDomainUpdater } from './HomeDomainUpdater';
import { TomlService } from '../../network/scan/TomlService';
import { FullValidatorUpdater } from './FullValidatorUpdater';
import { inject, injectable } from 'inversify';
import { GeoDataService } from './GeoDataService';
import { Logger } from '../../../../core/services/PinoLogger';
import { Result, err, ok } from 'neverthrow';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import { NodeScanResult } from './NodeScanResult';
import { QuorumSet } from '../../network/QuorumSet';
import { NodeIndex } from './node-index/node-index/node-index';
import { TrustGraphFactory } from './TrustGraphFactory';
import { StellarCoreVersion } from '../../network/StellarCoreVersion';
import { NodeMeasurementAverage } from '../NodeMeasurementAverage';

@injectable()
export class NodeScanner {
	constructor(
		private crawlerService: CrawlerService,
		private homeDomainUpdater: HomeDomainUpdater,
		private tomlService: TomlService,
		private fullValidatorUpdater: FullValidatorUpdater,
		@inject('GeoDataService')
		private geoDataService: GeoDataService,
		@inject('Logger')
		private logger: Logger
	) {}

	public async scan(
		time: Date,
		previousLatestLedger: string | null,
		previousLatestLedgerCloseTime: Date,
		networkQuorumSetConfiguration: QuorumSet,
		inputNodeDTOs: NodeDTO[],
		stellarCoreVersion: StellarCoreVersion
		//measurement30DayAverages: NodeMeasurementAverage[],
	): Promise<
		Result<
			{
				processedLedgers: number[];
				latestLedger: bigint;
				latestLedgerCloseTime: Date;
				nodeDTOs: NodeDTO[];
				nodeScanResults: NodeScanResult[];
			},
			Error
		>
	> {
		this.logger.info('Starting nodes crawl');

		const crawlResult = await this.crawlerService.crawl(
			previousLatestLedger,
			previousLatestLedgerCloseTime,
			networkQuorumSetConfiguration,
			inputNodeDTOs
		);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const nodeDTOs = crawlResult.value.nodes;
		const nodeResults = crawlResult.value.nodeResults;

		this.logger.info('Updating home domains');

		await this.homeDomainUpdater.updateHomeDomains(nodeDTOs);
		for (const nodeResult of nodeResults) {
			const homeDomainOrError = await this.homeDomainUpdater.fetchDomain(
				nodeResult.publicKey
			);
			if (homeDomainOrError.isOk()) {
				nodeResult.homeDomain = homeDomainOrError.value;
			}
		}

		this.logger.info('Processing home domains');
		const tomlObjects = await this.tomlService.fetchTomlObjects(nodeDTOs);

		this.logger.info('updating nodes from TOML');
		this.tomlService.updateNodes(tomlObjects, nodeDTOs, nodeResults);

		this.logger.info('Updating full validators');
		await this.fullValidatorUpdater.updateFullValidatorStatus(
			nodeDTOs,
			nodeResults,
			crawlResult.value.latestClosedLedger.sequence.toString()
		);

		await this.fullValidatorUpdater.updateArchiveVerificationStatus(
			nodeDTOs,
			nodeResults
		);

		if (crawlResult.value.nodesWithNewIP.length > 0) {
			this.logger.info('Updating geoData info', {
				nodes: crawlResult.value.nodesWithNewIP.map((node) => node.displayName)
			});
			await Promise.all(
				crawlResult.value.nodesWithNewIP.map(async (node: NodeDTO) => {
					const result = await this.geoDataService.fetchGeoData(node.ip);
					if (result.isErr()) this.logger.info(result.error.message);
					else {
						node.geoData.longitude = result.value.longitude;
						node.geoData.latitude = result.value.latitude;
						node.geoData.countryCode = result.value.countryCode;
						node.geoData.countryName = result.value.countryName;
						node.isp = result.value.isp;
						const nodeResult = nodeResults.find(
							(nodeResult) => nodeResult.publicKey === node.publicKey
						);
						if (nodeResult) {
							nodeResult.geoData = NodeGeoDataLocation.create({
								longitude: result.value.longitude,
								latitude: result.value.latitude,
								countryCode: result.value.countryCode,
								countryName: result.value.countryName
							});
							nodeResult.isp = result.value.isp;
						}
					}
				})
			);

			this.logger.info('Calculating node indexes'); //not the right place. Maybe index should be a separate thing, because it is tightly coupled to a network update.
			const indexes = NodeIndex.calculateIndexes(
				nodeDTOs.map((node) => {
					return {
						publicKey: node.publicKey,
						stellarCoreVersion: node.versionStr ?? 'unknown',
						dateDiscovered: node.dateDiscovered,
						validating30DaysPercentage:
							node.statistics.validating30DaysPercentage,
						isActive30DaysPercentage: node.statistics.active30DaysPercentage,
						isValidating: node.isValidating,
						hasUpToDateHistoryArchive: node.isFullValidator
					};
				}),
				TrustGraphFactory.create(nodeResults), //todo: include inactive but not archived nodes
				stellarCoreVersion.value
			);
			nodeDTOs.forEach((node) => {
				node.index = indexes.get(node.publicKey) ?? 0;
			});
		}

		return ok({
			processedLedgers: crawlResult.value.processedLedgers,
			latestLedger: crawlResult.value.latestClosedLedger.sequence,
			latestLedgerCloseTime: crawlResult.value.latestClosedLedger.closeTime,
			nodeDTOs: nodeDTOs,
			nodeScanResults: nodeResults
		});
	}
}
