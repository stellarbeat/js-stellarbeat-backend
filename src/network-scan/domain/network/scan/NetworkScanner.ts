import { QuorumSet } from '../QuorumSet';
import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import {
	Network as NetworkDTO,
	Node,
	TrustGraph
} from '@stellarbeat/js-stellarbeat-shared';
import { CrawlerService } from './node-crawl/CrawlerService';
import { HomeDomainUpdater } from './HomeDomainUpdater';
import { TomlService } from './TomlService';
import { FullValidatorUpdater } from './FullValidatorUpdater';
import { GeoDataService } from './GeoDataService';
import { Logger } from '../../../../core/services/PinoLogger';
import { inject, injectable } from 'inversify';
import NodeGeoDataLocation from '../../node/NodeGeoDataLocation';
import NodeQuorumSet from '../../node/NodeQuorumSet';
import { IndexNode, NodeIndex } from './node-index/node-index/node-index';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { Network } from '../Network';
import { TrustGraphFactory } from './TrustGraphFactory';

export type NetworkScanResult = {
	network: NetworkDTO;
	networkScan: NetworkScan;
};

export interface NodeScanResult {
	publicKey: string;
	quorumSet: NodeQuorumSet | null;
	quorumSetHash: string | null;
	ip: string | null;
	port: number | null;
	geoData: NodeGeoDataLocation | null;
	isp: string | null;
	participatingInSCP: boolean;
	isValidating: boolean;
	overLoaded: boolean;
	active: boolean;
	ledgerVersion: number | null;
	overlayVersion: number | null;
	overlayMinVersion: number | null;
	stellarCoreVersion: string | null;
	name: string | null;
	homeDomain: string | null;
	historyArchiveUrl: string | null;
	historyArchiveUpToDate: boolean | null;
	alias: string | null;
	host: string | null;
	historyArchiveHasError: boolean | null;
	index: number | null;
}

@injectable()
export class NetworkScanner {
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

	async update(
		networkDTO: NetworkDTO,
		network: Network
	): Promise<Result<NetworkScanResult, Error>> {
		this.logger.info('Starting nodes crawl');

		const crawlResult = await this.crawlerService.crawl(
			networkDTO.latestLedger,
			networkDTO.time,
			network.quorumSetConfiguration,
			networkDTO.nodes
		);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const networkScan = new NetworkScan(
			new Date(),
			crawlResult.value.processedLedgers
		);
		networkScan.latestLedger = crawlResult.value.latestClosedLedger.sequence;
		networkScan.latestLedgerCloseTime =
			crawlResult.value.latestClosedLedger.closeTime;
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

		this.logger.info('Processing organizations & nodes from TOML');
		const organizations = networkDTO.organizations;

		this.tomlService.updateOrganizationsAndNodes(
			//todo: split this up between nodes and organizations
			tomlObjects,
			organizations,
			nodeDTOs,
			nodeResults
		);

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
				crawlResult.value.nodesWithNewIP.map(async (node: Node) => {
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
		}

		const newNetwork: NetworkDTO = new NetworkDTO(
			nodeDTOs,
			organizations,
			networkScan.time,
			networkScan.latestLedger.toString()
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
			network.stellarCoreVersion.value
		);
		nodeDTOs.forEach((node) => {
			node.index = indexes.get(node.publicKey) ?? 0;
		});

		return ok({
			network: newNetwork,
			networkScan: networkScan
		});
	}
}
