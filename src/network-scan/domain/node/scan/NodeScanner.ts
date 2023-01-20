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
import { NodeScanProps } from './NodeScanProps';
import { QuorumSet } from '../../network/QuorumSet';
import { NodeIndex } from './node-index/node-index/node-index';
import { TrustGraphFactory } from './TrustGraphFactory';
import { StellarCoreVersion } from '../../network/StellarCoreVersion';
import { NodeMeasurementAverage } from '../NodeMeasurementAverage';
import Node from '../Node';
import { CrawlerMapper } from './node-crawl/CrawlerMapper';
import { NodeTomlInfoMapper } from './NodeTomlInfoMapper';

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
		nodes: Node[],
		inputNodeDTOs: NodeDTO[], //@deprecated
		stellarCoreVersion: StellarCoreVersion
		//measurement30DayAverages: NodeMeasurementAverage[],
	): Promise<
		Result<
			{
				processedLedgers: number[];
				latestLedger: bigint;
				latestLedgerCloseTime: Date;
				nodeDTOs: NodeDTO[];
				nodeScanResults: NodeScanProps[];
			},
			Error
		>
	> {
		this.logger.info('Starting nodes crawl');

		const crawlResult = await this.crawlerService.crawl(
			previousLatestLedger,
			previousLatestLedgerCloseTime,
			networkQuorumSetConfiguration,
			inputNodeDTOs,
			nodes.map((node) => {
				return {
					publicKey: node.publicKey,
					address: [node.ip, node.port],
					quorumSetHashKey: node.quorumSet ? node.quorumSet.hash : null,
					quorumSet: node.quorumSet ? node.quorumSet.quorumSet : null
				};
			})
		);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const nodeDTOs = crawlResult.value.nodeDTOs;
		const mappedPeerNodes = CrawlerMapper.mapPeerNodes(
			crawlResult.value.peerNodes
		);
		const nodeScanProps = mappedPeerNodes.nodeScanProps;
		const nodeScanMeasurements = mappedPeerNodes.nodeScanMeasurements;

		this.logger.info('Updating home domains');
		const domains = await this.homeDomainUpdater.fetchHomeDomains(
			nodeScanProps.map((node) => node.publicKey)
		);
		for (const nodeResult of nodeScanProps) {
			const domain = domains.get(nodeResult.publicKey);
			if (domain) {
				nodeResult.homeDomain = domain;
			}
		}

		this.logger.info('Processing home domains');
		const tomlObjects = await this.tomlService.fetchTomlObjects(
			nodeScanProps
				.filter((node) => node.homeDomain)
				.map((node) => node.homeDomain as string) //todo: type guard?
		);

		this.logger.info('updating nodes from TOML');
		const nodeTomlInfoCollection =
			this.tomlService.extractNodeTomlInfoCollection(tomlObjects);
		nodeTomlInfoCollection.forEach((nodeTomlInfo) => {
			const node = nodeScanProps.find(
				(node) => node.publicKey === nodeTomlInfo.publicKey
			);
			if (node)
				NodeTomlInfoMapper.updateNodeScanPropsFromTomlInfo(node, nodeTomlInfo);

			const nodeDTO = nodeDTOs.find(
				(node) => node.publicKey === nodeTomlInfo.publicKey
			);
			if (nodeDTO && nodeDTO.homeDomain === nodeTomlInfo.homeDomain) {
				nodeDTO.alias = nodeTomlInfo.alias;
				nodeDTO.historyUrl = nodeTomlInfo.historyUrl;
				nodeDTO.name = nodeTomlInfo.name;
				nodeDTO.host = nodeTomlInfo.host;
			}
		});

		this.logger.info('Updating full validators');
		await this.fullValidatorUpdater.updateFullValidatorStatus(
			nodeDTOs,
			nodeScanMeasurements,
			crawlResult.value.latestClosedLedger.sequence.toString()
		);

		await this.fullValidatorUpdater.updateArchiveVerificationStatus(
			nodeDTOs,
			nodeScanMeasurements
		);

		if (crawlResult.value.nodeDTOsWithNewIP.length > 0) {
			this.logger.info('Updating geoData info', {
				nodes: crawlResult.value.nodeDTOsWithNewIP.map(
					(node) => node.displayName
				)
			});
			await Promise.all(
				crawlResult.value.nodeDTOsWithNewIP.map(async (node: NodeDTO) => {
					const result = await this.geoDataService.fetchGeoData(node.ip);
					if (result.isErr()) this.logger.info(result.error.message);
					else {
						node.geoData.longitude = result.value.longitude;
						node.geoData.latitude = result.value.latitude;
						node.geoData.countryCode = result.value.countryCode;
						node.geoData.countryName = result.value.countryName;
						node.isp = result.value.isp;
						const nodeResult = nodeScanProps.find(
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
				TrustGraphFactory.create(nodeScanProps), //todo: include inactive but not archived nodes
				stellarCoreVersion.value
			);
			nodeDTOs.forEach((node) => {
				node.index = indexes.get(node.publicKey) ?? 0;
			});
			nodeScanMeasurements.forEach((measurement) => {
				measurement.index = indexes.get(measurement.publicKey) ?? 0;
			});
		}

		return ok({
			processedLedgers: crawlResult.value.processedLedgers,
			latestLedger: crawlResult.value.latestClosedLedger.sequence,
			latestLedgerCloseTime: crawlResult.value.latestClosedLedger.closeTime,
			nodeDTOs: nodeDTOs,
			nodeScanResults: nodeScanProps
		});
	}
}
